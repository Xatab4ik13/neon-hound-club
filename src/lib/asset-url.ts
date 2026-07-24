// Резолвер CDN-URL для Lovable-ассетов, приходящих с бэка.
// `.asset.json` импорты во фронте перебиваются vite-плагином из vite.config.ts,
// но строки с `/__l5e/...`, полученные через API (например, аватар/галерея
// инструктора), плагин не видит — их разруливаем здесь в рантайме.

const CDN_BASE = (
  (import.meta.env.VITE_LOVABLE_ASSET_BASE as string | undefined) ||
  "https://id-preview--684793f4-d120-461e-9357-79d82baeb567.lovable.app"
).replace(/\/$/, "");

export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/__l5e/")) return `${CDN_BASE}${url}`;
  return url;
}
