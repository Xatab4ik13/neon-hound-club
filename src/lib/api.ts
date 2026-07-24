// Тонкий хелпер для вызовов Fastify-бэкенда (Hell AI и т.д.).
// VITE_BACKEND_URL: пустая строка = same-origin (в проде фронт и бэк под одним доменом).
export const BACKEND_URL =
  ((import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ||
    "https://api.hhr.pro");

// База для картинок с Lovable CDN. Ассеты, загруженные в админке, лежат в БД
// как относительные пути `/__l5e/...` — фронт крутится на hhr.pro, где такого
// пути нет, поэтому в рантайме подставляем абсолютный CDN-хост в любой строке
// JSON-ответа. Одна точка правды вместо ручного resolveAssetUrl по адаптерам.
const LOVABLE_CDN_BASE = (
  (import.meta.env.VITE_LOVABLE_ASSET_BASE as string | undefined) ||
  "https://id-preview--684793f4-d120-461e-9357-79d82baeb567.lovable.app"
).replace(/\/$/, "");
function rewriteLovableAssetUrls(input: string): string {
  if (input.indexOf('"/__l5e/') === -1) return input;
  return input.replace(/"\/__l5e\//g, `"${LOVABLE_CDN_BASE}/__l5e/`);
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  // Content-Type ставим только если реально есть body — иначе Fastify
  // отвечает 400 FST_ERR_CTP_EMPTY_JSON на DELETE/GET без тела.
  const hasBody = init.body !== undefined && init.body !== null;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (hasBody && !isFormData && !Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  const text = await res.text();
  const rewritten = rewriteLovableAssetUrls(text);
  let body: unknown = null;
  try {
    body = rewritten ? JSON.parse(rewritten) : null;
  } catch {
    body = rewritten;
  }
  if (!res.ok) {
    const b = body as { error?: string; message?: string } | null;
    throw new ApiError(res.status, b?.error ?? "request_failed", b?.message ?? res.statusText);
  }
  return body as T;
}
