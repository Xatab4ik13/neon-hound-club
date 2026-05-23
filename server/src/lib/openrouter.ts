// Тонкий клиент OpenRouter. OpenAI-совместимый API.
// Ключ читаем из process.env.OPENROUTER_API_KEY (выставляется в .env на VPS).

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletion = {
  answer: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
};

export class OpenRouterError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function chatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<ChatCompletion> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new OpenRouterError(500, "OPENROUTER_API_KEY не настроен на сервере");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      // OpenRouter рекомендует прислать referer и title для аналитики.
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://hhr.pro",
      "X-Title": "HELLHOUND Racing — Hell AI",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 800,
      stream: false,
    }),
    signal: opts.signal,
  });

  const raw = await res.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // вернётся как текст
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      (typeof data === "string" ? data : raw) ||
      `OpenRouter ${res.status}`;
    throw new OpenRouterError(res.status, String(msg).slice(0, 300));
  }

  const answer: string = data?.choices?.[0]?.message?.content?.toString() ?? "";
  const tokensIn = (data?.usage?.prompt_tokens as number | undefined) ?? null;
  const tokensOut = (data?.usage?.completion_tokens as number | undefined) ?? null;
  const model = (data?.model as string | undefined) ?? opts.model;

  if (!answer.trim()) {
    throw new OpenRouterError(502, "Пустой ответ от модели");
  }

  return { answer, model, tokensIn, tokensOut };
}
