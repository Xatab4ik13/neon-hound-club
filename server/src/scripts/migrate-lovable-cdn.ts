/**
 * Разовая миграция: перенести все ссылки на Lovable CDN
 * (/__l5e/assets-v1/... и *.lovable.app / *.lovableproject.com)
 * из БД в собственный MinIO/S3, чтобы фото грузились без VPN.
 *
 * Запуск на VPS:
 *   sudo docker compose exec api node dist/scripts/migrate-lovable-cdn.js
 *
 * Что делает:
 * 1. Проходит по всем public.* таблицам с колонками text/varchar/jsonb.
 * 2. В каждой строке ищет Lovable-URL, скачивает файл, кладёт в MinIO
 *    под ключом `imported/{table}/{column}/{filename}`, переписывает URL
 *    на https://api.hhr.pro/media/... .
 * 3. Идемпотентно: наши URL пропускаются, файл в бакете не перезаливается.
 */

import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { s3, S3_BUCKET, S3_PUBLIC_URL, ensureBucket } from "../lib/s3.js";
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const LOVABLE_PREVIEW = "https://id-preview--684793f4-d120-461e-9357-79d82baeb567.lovable.app";

// Ищем и абсолютные URL, и относительные пути /__l5e/assets-v1/...
const LOVABLE_URL_RE =
  /(https?:\/\/[^\s"'<>()]*?(?:\/__l5e\/assets-v1\/[^\s"'<>()]+|lovable(?:project)?\.(?:app|com|dev)\/[^\s"'<>()]*))|(\/__l5e\/assets-v1\/[^\s"'<>()]+)/gi;

function toAbsolute(u: string): string {
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/__l5e/")) return LOVABLE_PREVIEW + u;
  return u;
}

function isOurUrl(u: string): boolean {
  return u.startsWith(S3_PUBLIC_URL);
}

function extFromContentType(ct: string): string {
  const t = ct.split(";")[0].trim().toLowerCase();
  switch (t) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/svg+xml": return "svg";
    case "video/mp4": return "mp4";
    case "video/webm": return "webm";
    case "application/pdf": return "pdf";
    default: return "bin";
  }
}

// Кэш: старый URL → новый URL (за один прогон), чтобы одинаковые ассеты не тянуть дважды
const cache = new Map<string, string>();
let uploaded = 0;
let skipped = 0;
let failed = 0;

async function migrateOne(sourceUrl: string, table: string, column: string): Promise<string> {
  if (isOurUrl(sourceUrl)) return sourceUrl;
  const cached = cache.get(sourceUrl);
  if (cached) return cached;

  const abs = toAbsolute(sourceUrl);
  const res = await fetch(abs);
  if (!res.ok) throw new Error(`Fetch ${abs} → ${res.status}`);
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = extFromContentType(contentType);

  const nameFromUrl = abs.split("/").pop()?.split("?")[0] || "";
  const baseName = (nameFromUrl.replace(/\.[^.]+$/, "") || randomUUID())
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);
  const safeCol = column.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeTable = table.replace(/[^a-zA-Z0-9_-]/g, "");
  const key = `imported/${safeTable}/${safeCol}/${baseName || randomUUID()}.${ext}`;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  } catch {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buf,
        ContentType: contentType,
      }),
    );
  }
  const newUrl = `${S3_PUBLIC_URL}/${key}`;
  cache.set(sourceUrl, newUrl);
  uploaded++;
  return newUrl;
}

async function rewriteString(value: string, table: string, column: string): Promise<{ value: string; changed: boolean }> {
  let changed = false;
  const matches = Array.from(value.matchAll(LOVABLE_URL_RE)).map((m) => m[0]);
  if (matches.length === 0) return { value, changed: false };

  let out = value;
  for (const orig of new Set(matches)) {
    if (isOurUrl(orig)) continue;
    try {
      const next = await migrateOne(orig, table, column);
      // Заменяем все вхождения этого конкретного URL
      out = out.split(orig).join(next);
      changed = true;
    } catch (e: any) {
      failed++;
      console.warn(`  [${table}.${column}] FAILED ${orig}: ${e.message}`);
    }
  }
  return { value: out, changed };
}

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  pk: string | null;
}

async function listColumns(): Promise<ColumnInfo[]> {
  const { rows } = await db.execute<any>(sql`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name
         AND kcu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = c.table_name
          AND tc.constraint_type = 'PRIMARY KEY'
        LIMIT 1
      ) AS pk
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('text', 'character varying', 'jsonb', 'json')
    ORDER BY c.table_name, c.column_name
  `);
  return rows as ColumnInfo[];
}

async function sweepTableColumn(info: ColumnInfo) {
  if (!info.pk) return; // без первичного ключа не обновим точечно
  const { table_name: t, column_name: col, pk, data_type: dt } = info;

  // Быстрый префильтр: только строки, где вообще встречается что-то похожее на Lovable
  const filter =
    dt === "jsonb" || dt === "json"
      ? sql`(${sql.raw(`"${col}"::text`)} ILIKE '%/__l5e/assets-v1/%' OR ${sql.raw(`"${col}"::text`)} ILIKE '%lovable%')`
      : sql`(${sql.raw(`"${col}"`)} ILIKE '%/__l5e/assets-v1/%' OR ${sql.raw(`"${col}"`)} ILIKE '%lovable%')`;

  const { rows } = await db.execute<any>(
    sql`SELECT ${sql.raw(`"${pk}"`)} AS id, ${sql.raw(`"${col}"`)}::text AS val FROM ${sql.raw(`public."${t}"`)} WHERE ${filter}`,
  );
  if (rows.length === 0) return;
  console.log(`[${t}.${col}] candidates: ${rows.length}`);

  for (const r of rows as Array<{ id: any; val: string | null }>) {
    if (!r.val) continue;
    const { value: newVal, changed } = await rewriteString(r.val, t, col);
    if (!changed) {
      skipped++;
      continue;
    }
    // Обновляем: для jsonb приводим текст обратно к jsonb
    const cast = dt === "jsonb" ? "::jsonb" : dt === "json" ? "::json" : "";
    await db.execute(
      sql`UPDATE ${sql.raw(`public."${t}"`)} SET ${sql.raw(`"${col}"`)} = ${newVal}${sql.raw(cast)} WHERE ${sql.raw(`"${pk}"`)} = ${r.id}`,
    );
    console.log(`  [${t}.${col}] id=${r.id} ✓`);
  }
}

async function main() {
  console.log(`MinIO: bucket=${S3_BUCKET} public=${S3_PUBLIC_URL}`);
  await ensureBucket();

  const cols = await listColumns();
  console.log(`Scanning ${cols.length} text/jsonb columns…`);
  for (const c of cols) {
    try {
      await sweepTableColumn(c);
    } catch (e: any) {
      console.warn(`[${c.table_name}.${c.column_name}] sweep error: ${e.message}`);
    }
  }
  console.log(`Done. uploaded=${uploaded} skipped_rows=${skipped} failed=${failed}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
