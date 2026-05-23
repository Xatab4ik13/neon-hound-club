// Тонкий хелпер для вызовов Fastify-бэкенда (Hell AI и т.д.).
// VITE_BACKEND_URL: пустая строка = same-origin (в проде фронт и бэк под одним доменом).
export const BACKEND_URL =
  ((import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ||
    "https://api.hhr.pro");

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
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const b = body as { error?: string; message?: string } | null;
    throw new ApiError(res.status, b?.error ?? "request_failed", b?.message ?? res.statusText);
  }
  return body as T;
}
