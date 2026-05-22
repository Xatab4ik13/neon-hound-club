// Тонкий хелпер для вызовов Fastify-бэкенда (Hell AI и т.д.).
// VITE_BACKEND_URL: пустая строка = same-origin (в проде фронт и бэк под одним доменом).
const BACKEND_URL =
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
  const res = await fetch(`${BACKEND_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
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
