import type { FastifyInstance } from "fastify";
import { Readable } from "node:stream";
import { getObjectStream } from "../lib/s3.js";

/**
 * GET /media/*  — публичный прокси на S3/MinIO.
 * Так api.hhr.pro/media/<key> отдаёт файл без необходимости открывать MinIO наружу.
 */
export async function mediaRoutes(app: FastifyInstance) {
  app.get("/*", async (req, reply) => {
    const wildcard = (req.params as { "*"?: string })["*"] || "";
    const key = wildcard.replace(/^\/+/, "");
    if (!key || key.includes("..")) {
      return reply.code(400).send({ error: "bad_key" });
    }

    try {
      const obj = await getObjectStream(key);
      if (obj.ContentType) reply.header("Content-Type", obj.ContentType);
      if (obj.ContentLength != null) reply.header("Content-Length", String(obj.ContentLength));
      if (obj.ETag) reply.header("ETag", obj.ETag);
      reply.header("Cache-Control", "public, max-age=31536000, immutable");

      const body = obj.Body as any;
      // AWS SDK v3 в Node возвращает Readable.
      if (body && typeof body.pipe === "function") {
        return reply.send(body as Readable);
      }
      // Fallback: web-stream → buffer
      if (body && typeof body.transformToByteArray === "function") {
        const bytes = await body.transformToByteArray();
        return reply.send(Buffer.from(bytes));
      }
      return reply.code(500).send({ error: "no_body" });
    } catch (e: any) {
      const name = e?.name || "";
      if (/NoSuchKey|NotFound/i.test(name)) {
        return reply.code(404).send({ error: "not_found" });
      }
      req.log.error({ err: e, key }, "media fetch failed");
      return reply.code(500).send({ error: "media_error" });
    }
  });
}
