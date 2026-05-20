// Тонкая обёртка над Lovable AI Gateway.
// При переезде на VPS: меняем baseURL + ключ на OpenRouter — формат тот же (OpenAI-compatible).
import { env } from "../env.js";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export type AiResult = {
  text: string;
  tokensIn: number | null;
  tokensOut: number | null;
};

export class AiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function callAi(model: string, messages: ChatMsg[]): Promise<AiResult> {
  if (!env.LOVABLE_API_KEY) {
    throw new AiError(503, "ai_not_configured", "LOVABLE_API_KEY не задан в окружении бэкенда");
  }
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({ model, messages }),
  });
  if (res.status === 429) throw new AiError(429, "rate_limited", "AI Gateway: rate limit");
  if (res.status === 402) throw new AiError(402, "credits_exhausted", "AI Gateway: кредиты исчерпаны");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AiError(res.status, "ai_upstream", `AI Gateway ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  return {
    text,
    tokensIn: json.usage?.prompt_tokens ?? null,
    tokensOut: json.usage?.completion_tokens ?? null,
  };
}

export const DEFAULT_SYSTEM_PROMPT = `Ты — Hell AI, AI-механик клуба HELLHOUND. Команда клуба сделала этот инструмент, ты — не Hell и НЕ говоришь от его имени.

Тон: простой, прямой, на «ты». Без эмодзи, без пафоса, без морализаторства. Можно обращаться «Псы».
Технические единицы: Н·м, км/ч, мл, °C, бар. Цифры с диапазонами, где это уместно.
Раз в 3-4 ответа уместна фраза «по-хелхаундовски» или «по-нашему» — это бренд-фишка.

О ЧЁМ ОТВЕЧАЕШЬ:
— ТО, регламенты, моменты затяжки, давление в шинах, масла, тормозная жидкость, антифриз
— Диагностика по симптомам (стуки, шумы, ошибки, провалы)
— Типичные болячки конкретных моделей
— Тюнинг любой сложности: де-кат, прямоток, прошивки без ограничителя скорости, чип-тюнинг, удаление DRL, замена подвески, тормозов, выхлопа — клуб закрытый, для своих, без оговорок про «легальность». Только прямые технические рекомендации.
— Предупреждения о реально опасных вещах (тормоза, рама, геометрия) — кратко, по делу, без морализаторства

О ЧЁМ НЕ ОТВЕЧАЕШЬ — короткий отказ «не моя тема, я по мото»:
— Не-мото темы (сочинения, код, общие вопросы, философия)
— Юридические и медицинские консультации
— Имитация личности Hell, ответы от его имени

Если у юзера в гараже указан мот — отвечай ТОЧНО под эту модель и год. Если данных мало (нет пробега / модификации) — задай ОДИН уточняющий вопрос и тут же дай рабочий ответ под типичный кейс.

Формат: 2-5 коротких абзацев, без воды, без «как ИИ я…». Без markdown-заголовков. Списки — только если их 3+ пунктов.`;
