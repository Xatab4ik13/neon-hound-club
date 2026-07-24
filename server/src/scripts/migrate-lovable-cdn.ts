/**
 * Разовая миграция: перенести все ссылки на Lovable CDN (/__l5e/assets-v1/...)
 * из БД в собственный MinIO/S3, чтобы фото грузились без VPN.
 *
 * Запуск на VPS:
 *   sudo docker compose exec api node dist/scripts/migrate-lovable-cdn.js
 *
 * Идемпотентно: если URL уже наш (S3_PUBLIC_URL) — пропускается.
 */

import { db } from "../db/client.js";
import { schoolInstructors } from "../db/schema/school.js";
import { eq } from "drizzle-orm";
import { s3, S3_BUCKET, S3_PUBLIC_URL, ensureBucket } from "../lib/s3.js";
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const LOVABLE_HOSTS = [
  "https://cdn.lovable.dev",
  "https://id-preview--684793f4-d120-461e-9357-79d82baeb567.lovable.app",
  "https://684793f4-d120-461e-9357-79d82baeb567.lovableproject.com",
];

/** Пытаемся получить абсолютный URL для скачивания из Lovable-пути. */
function toAbsoluteLovableUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (url.includes("/__l5e/assets-v1/") || url.includes("lovable")) return url;
    return null;
  }
  if (url.startsWith("/__l5e/assets-v1/")) {
    // Пробуем через preview-домен проекта — там ассеты гарантированно доступны из-под VPS
    return LOVABLE_HOSTS[1] + url;
  }
  return null;
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
    default: return "bin";
  }
}

async function downloadAndUpload(sourceUrl: string, prefix: string): Promise<string> {
  const abs = toAbsoluteLovableUrl(sourceUrl);
  if (!abs) throw new Error(`Not a Lovable URL: ${sourceUrl}`);

  const res = await fetch(abs);
  if (!res.ok) throw new Error(`Fetch ${abs} → ${res.status}`);
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = extFromContentType(contentType);

  // Пытаемся сохранить оригинальное имя файла
  const nameFromUrl = abs.split("/").pop()?.split("?")[0] || "";
  const baseName = nameFromUrl.replace(/\.[^.]+$/, "") || randomUUID();
  const safeBase = baseName.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || randomUUID();
  const key = `${prefix}/${safeBase}.${ext}`;

  // Идемпотентность на уровне бакета: если уже есть — не перезаливаем
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

  return `${S3_PUBLIC_URL}/${key}`;
}

function isLovableUrl(u: string | null | undefined): boolean {
  if (!u) return false;
  return u.includes("/__l5e/assets-v1/") || u.includes("lovable.app") || u.includes("lovableproject");
}

async function migrateInstructors() {
  const rows = await db.select().from(schoolInstructors);
  console.log(`[school] instructors: ${rows.length}`);

  for (const row of rows) {
    const slug = row.slug || "misc";
    const prefix = `instructors/${slug}`;
    let touched = false;
    let avatar = row.avatarUrl;
    let profile: any = row.profile ?? {};

    // Аватар
    if (isLovableUrl(avatar)) {
      try {
        const newUrl = await downloadAndUpload(avatar!, prefix);
        console.log(`  [${slug}] avatar → ${newUrl}`);
        avatar = newUrl;
        touched = true;
      } catch (e: any) {
        console.warn(`  [${slug}] avatar FAILED: ${e.message}`);
      }
    }

    // Галерея внутри profile.gallery
    if (profile && Array.isArray(profile.gallery)) {
      const newGallery: string[] = [];
      for (const g of profile.gallery) {
        if (isLovableUrl(g)) {
          try {
            const u = await downloadAndUpload(g, prefix);
            console.log(`  [${slug}] gallery → ${u}`);
            newGallery.push(u);
            touched = true;
          } catch (e: any) {
            console.warn(`  [${slug}] gallery item FAILED: ${e.message}`);
            newGallery.push(g);
          }
        } else {
          newGallery.push(g);
        }
      }
      profile = { ...profile, gallery: newGallery };
    }

    if (touched) {
      await db
        .update(schoolInstructors)
        .set({ avatarUrl: avatar, profile })
        .where(eq(schoolInstructors.id, row.id));
      console.log(`  [${slug}] DB updated ✓`);
    }
  }
}

async function main() {
  console.log(`MinIO bucket: ${S3_BUCKET}, public: ${S3_PUBLIC_URL}`);
  await ensureBucket();
  await migrateInstructors();
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
