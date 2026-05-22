import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, type SessionPayload } from "../lib/auth.js";
import {
  UPLOAD_RULES,
  buildObjectKey,
  presignPutUrl,
  publicUrl,
  type UploadKind,
} from "../lib/s3.js";

const KINDS: UploadKind[] = ["avatar", "bike", "product", "raffle", "shop"];

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
  app.post("/sign", { preHandler: requireAuth }, async (req, reply) => {
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
}
