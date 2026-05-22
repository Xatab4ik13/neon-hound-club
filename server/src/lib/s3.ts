import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const endpoint = process.env.S3_ENDPOINT || "http://minio:9000";
const region = process.env.S3_REGION || "us-east-1";
const accessKeyId = process.env.S3_ACCESS_KEY || "hellhound";
const secretAccessKey = process.env.S3_SECRET_KEY || "hellhound-secret";
export const S3_BUCKET = process.env.S3_BUCKET || "hellhound-media";
/** Базовый URL, по которому фронт читает медиа. По умолчанию — наш API-прокси /media. */
export const S3_PUBLIC_URL =
  (process.env.S3_PUBLIC_URL || "https://api.hhr.pro/media").replace(/\/+$/, "");

export const s3 = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true, // MinIO
});

/** Создаёт бакет, если его нет. Вызывается один раз при старте. */
export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    } catch (e: any) {
      // BucketAlreadyOwnedByYou — это ок
      if (!/BucketAlreadyOwnedByYou|BucketAlreadyExists/i.test(e?.name || e?.message || "")) {
        throw e;
      }
    }
  }
}

export type UploadKind = "avatar" | "bike" | "product" | "raffle" | "shop";

/** Допустимые типы и максимальные размеры по категории. */
export const UPLOAD_RULES: Record<
  UploadKind,
  { mimes: readonly string[]; maxSize: number; prefix: string }
> = {
  // Аватар: до 15 МБ — чтобы юзер мог загрузить большое фото с телефона и обрезать кружок на фронте.
  avatar: { mimes: ["image/jpeg", "image/png", "image/webp"], maxSize: 15 * 1024 * 1024, prefix: "avatars" },
  bike: { mimes: ["image/jpeg", "image/png", "image/webp"], maxSize: 8 * 1024 * 1024, prefix: "bikes" },
  product: { mimes: ["image/jpeg", "image/png", "image/webp"], maxSize: 10 * 1024 * 1024, prefix: "products" },
  raffle: { mimes: ["image/jpeg", "image/png", "image/webp"], maxSize: 10 * 1024 * 1024, prefix: "raffles" },
  shop: { mimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"], maxSize: 10 * 1024 * 1024, prefix: "shop" },
};

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "application/pdf": return "pdf";
    default: return "bin";
  }
}

/** Строит ключ объекта вида `prefix/scope/uuid.ext`. */
export function buildObjectKey(kind: UploadKind, scope: string, mime: string): string {
  const safeScope = scope.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";
  const id = randomUUID();
  return `${UPLOAD_RULES[kind].prefix}/${safeScope}/${id}.${extFromMime(mime)}`;
}

/** Presigned PUT URL — фронт грузит файл напрямую в S3/MinIO. */
export async function presignPutUrl(
  key: string,
  contentType: string,
  contentLength: number,
  expiresInSec = 300,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
}

/** Публичный URL для чтения медиа (через наш /media-прокси). */
export function publicUrl(key: string): string {
  return `${S3_PUBLIC_URL}/${key}`;
}

export async function getObjectStream(key: string) {
  return s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

/** Достаёт ключ объекта из публичного URL, если он наш. Иначе null. */
export function keyFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = S3_PUBLIC_URL + "/";
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}
