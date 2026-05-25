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

// Стриминг: async generator, отдаёт текстовые дельты по SSE OpenRouter.
// В конце возвращает meta (model, usage, итоговый answer).
export type StreamMeta = {
  answer: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
};

export async function* streamChatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): AsyncGenerator<string, StreamMeta, unknown> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new OpenRouterError(500, "OPENROUTER_API_KEY не настроен на сервере");

  const isReasoning = /^openai\/(gpt-5|o[1-9])/i.test(opts.model);
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? (isReasoning ? 2000 : 800),
    stream: true,
  };
  if (!isReasoning) {
    body.temperature = opts.temperature ?? 0.6;
  } else {
    body.reasoning = { effort: "low" };
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://hhr.pro",
      "X-Title": "HELLHOUND Racing - Hell AI",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const raw = await res.text().catch(() => "");
    let msg = `OpenRouter ${res.status}`;
    try {
      const j = JSON.parse(raw);
      msg = j?.error?.message || j?.message || raw || msg;
    } catch {
      if (raw) msg = raw;
    }
    throw new OpenRouterError(res.status, String(msg).slice(0, 300));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let model = opts.model;
  let tokensIn: number | null = null;
  let tokensOut: number | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE — события разделены пустой строкой; внутри строки `data: ...`.
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, "");
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        if (line.startsWith(":")) continue; // keep-alive
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") {
          return { answer, model, tokensIn, tokensOut };
        }
        try {
          const data = JSON.parse(payload);
          if (data?.model) model = data.model;
          const delta: string | undefined = data?.choices?.[0]?.delta?.content;
          if (delta) {
            answer += delta;
            yield delta;
          }
          if (data?.usage) {
            tokensIn = data.usage.prompt_tokens ?? tokensIn;
            tokensOut = data.usage.completion_tokens ?? tokensOut;
          }
        } catch {
          // битый chunk — пропускаем
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* noop */ }
  }

  if (!answer.trim()) {
    throw new OpenRouterError(502, "Пустой ответ от модели");
  }
  return { answer, model, tokensIn, tokensOut };
}
