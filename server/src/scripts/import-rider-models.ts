/**
 * Разовая заливка 3D-моделей райдера (HELL HUNT) в наш MinIO,
 * чтобы персонаж грузился с api.hhr.pro, а не с Lovable CDN (недоступен без VPN).
 *
 * Запуск на VPS:
 *   sudo docker compose exec api node dist/scripts/import-rider-models.js
 *
 * Идемпотентно: если объект уже в бакете — скачивание пропускается.
 * Ключи стабильные, фронт ждёт именно их: models/rider.glb и т.д.
 */

import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET, S3_PUBLIC_URL, ensureBucket } from "../lib/s3.js";

const SOURCE_BASE =
  process.env.LOVABLE_ASSET_BASE ||
  "https://id-preview--684793f4-d120-461e-9357-79d82baeb567.lovable.app";

/** key в бакете → путь на источнике. */
const MODELS: { key: string; src: string }[] = [
  {
    key: "models/rider-v2.glb",
    src: "/__l5e/assets-v1/1777b712-7ef5-4a24-90e5-4b579ae843ce/rider-v2.glb",
  },
  {
    key: "models/rider-victory.glb",
    src: "/__l5e/assets-v1/abe6ec6d-a795-42e2-9d77-93bb3f5d7c80/rider-victory.glb",
  },
  {
    key: "models/rider-agree-v2.glb",
    src: "/__l5e/assets-v1/3220f397-071b-41d2-862e-386be6e6da4f/rider-agree-v2.glb",
  },
];

async function exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await ensureBucket();
  const force = process.argv.includes("--force");

  for (const m of MODELS) {
    if (!force && (await exists(m.key))) {
      console.log(`skip  ${m.key} (уже в бакете)`);
      continue;
    }
    const url = m.src.startsWith("http") ? m.src : SOURCE_BASE + m.src;
    console.log(`fetch ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`FAIL  ${m.key}: HTTP ${res.status}`);
      process.exitCode = 1;
      continue;
    }
    const body = Buffer.from(await res.arrayBuffer());
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: m.key,
        Body: body,
        ContentType: "model/gltf-binary",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    console.log(`ok    ${S3_PUBLIC_URL}/${m.key} (${(body.length / 1048576).toFixed(1)} МБ)`);
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
