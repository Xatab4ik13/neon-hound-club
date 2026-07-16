import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAuthOrAdmin, type SessionPayload } from "../lib/auth.js";
import {
  S3_BUCKET,
  UPLOAD_RULES,
  buildObjectKey,
  presignPutUrl,
  publicUrl,
  s3,
  type UploadKind,
} from "../lib/s3.js";


const KINDS: UploadKind[] = ["avatar", "bike", "product", "raffle", "shop", "post"];

const signSchema = z.object({
  kind: z.enum(KINDS as [UploadKind, ...UploadKind[]]),
  contentType: z.string().min(3).max(120),
  size: z.number().int().positive(),
  // Произвольная сужающая подметка (id мото, id товара) — попадёт в ключ.
  scope: z.string().trim().max(64).optional(),
});

/**
 * POST /api/v1/uploads/sign — возвращает presigned PUT URL и публичный URL.
 * Авторизация обязательна. Категории product / raffle — только для админов.
 */
export async function uploadsRoutes(app: FastifyInstance) {
  app.post("/sign", { preHandler: requireAuthOrAdmin }, async (req, reply) => {
    const parsed = signSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: parsed.error.message });
    }
    const { kind, contentType, size, scope } = parsed.data;
    const user = req.user as SessionPayload;

    if ((kind === "product" || kind === "raffle" || kind === "shop") && user.role !== "admin") {
      return reply.code(403).send({ error: "forbidden", message: "Только для админа" });
    }

    const rules = UPLOAD_RULES[kind];
    if (!rules.mimes.includes(contentType)) {
      return reply
        .code(400)
        .send({ error: "bad_mime", message: `Недопустимый тип файла: ${contentType}` });
    }
    if (size > rules.maxSize) {
      const mb = Math.round(rules.maxSize / (1024 * 1024));
      return reply
        .code(400)
        .send({ error: "too_large", message: `Файл больше ${mb} МБ` });
    }

    const key = buildObjectKey(kind, scope || user.sub, contentType);
    const uploadUrl = await presignPutUrl(key, contentType, size, 300);

    return {
      key,
      uploadUrl,
      publicUrl: publicUrl(key),
      method: "PUT",
      headers: { "Content-Type": contentType },
      expiresIn: 300,
    };
  });

  /**
   * POST /api/v1/uploads/direct — фронт шлёт multipart/form-data с полем `file`
   * и query/field `kind` (+ опционально `scope`). Бек кладёт файл в S3/MinIO
   * сам и возвращает публичный URL. Нужен, когда presigned PUT недоступен
   * из браузера (внутренний хост MinIO, mixed content и т.п.).
   */
  app.post("/direct", { preHandler: requireAuthOrAdmin }, async (req, reply) => {
    const user = req.user as SessionPayload;
    const mp = await req.file();
    if (!mp) {
      return reply.code(400).send({ error: "bad_request", message: "Файл не пришёл" });
    }

    const kindRaw = (mp.fields?.kind as { value?: string } | undefined)?.value
      ?? (req.query as { kind?: string }).kind;
    const scopeRaw = (mp.fields?.scope as { value?: string } | undefined)?.value
      ?? (req.query as { scope?: string }).scope;

    if (!kindRaw || !KINDS.includes(kindRaw as UploadKind)) {
      return reply.code(400).send({ error: "bad_request", message: "Неверный kind" });
    }
    const kind = kindRaw as UploadKind;

    if ((kind === "product" || kind === "raffle" || kind === "shop") && user.role !== "admin") {
      return reply.code(403).send({ error: "forbidden", message: "Только для админа" });
    }

    const rules = UPLOAD_RULES[kind];
    const contentType = mp.mimetype || "application/octet-stream";
    if (!rules.mimes.includes(contentType)) {
      return reply.code(400).send({ error: "bad_mime", message: `Недопустимый тип файла: ${contentType}` });
    }

    const buf = await mp.toBuffer();
    if (buf.length > rules.maxSize) {
      const mb = Math.round(rules.maxSize / (1024 * 1024));
      return reply.code(400).send({ error: "too_large", message: `Файл больше ${mb} МБ` });
    }

    const key = buildObjectKey(kind, scopeRaw || user.sub, contentType);
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buf,
      ContentType: contentType,
      ContentLength: buf.length,
    }));

    return { key, publicUrl: publicUrl(key) };
  });
}

