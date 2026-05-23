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

  // GPT-5 — reasoning-модель: не принимает кастомный temperature и съедает
  // весь max_tokens на внутренний reasoning, если не ограничить effort.
  const isReasoning = /^openai\/(gpt-5|o[1-9])/i.test(opts.model);

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    // reasoning-моделям нужен большой бюджет, иначе пустой ответ.
    max_tokens: opts.maxTokens ?? (isReasoning ? 2000 : 800),
    stream: false,
  };
  if (!isReasoning) {
    body.temperature = opts.temperature ?? 0.6;
  } else {
    // минимальный reasoning, чтобы не ждать по 10 сек и оставить токены под ответ.
    body.reasoning = { effort: "low" };
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://hhr.pro",
      "X-Title": "HELLHOUND Racing - Hell AI",
    },
    body: JSON.stringify(body),
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
