// Отбор новостей: батч-скоринг заголовков дешёвой моделью.
import { chatCompletion } from "../openrouter.js";
import { FILTER_SYSTEM } from "./prompts.js";

export type FilterInput = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  lang: string;
  ageHours: number | null;
};

export type FilterVerdict = {
  id: string;
  score: number;
  hot: boolean;
  topic: string;
  reason: string;
};

/** Достаёт JSON из ответа модели, даже если он обёрнут в ```json. */
export function parseJsonLoose(raw: string): unknown {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // ищем первый сбалансированный { … } или [ … ]
    const start = cleaned.search(/[[{]/);
    if (start < 0) return null;
    const open = cleaned[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === open) depth++;
      else if (cleaned[i] === close) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
    // не закрылось — ответ обрезан по лимиту токенов, пробуем починить хвост
    return repairTruncatedJson(cleaned.slice(start));
  }
}

/** Достраивает обрезанный JSON: закрывает строку и все открытые скобки. */
function repairTruncatedJson(src: string): unknown {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of src) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = src;
  if (inString) out += '"';
  // убираем висящую запятую / незаконченный ключ
  out = out.replace(/,\s*("[^"]*"\s*:?\s*)?$/, "");
  while (stack.length) out += stack.pop();
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}


const TOPICS = [
  "новинки",
  "анонсы",
  "гонки",
  "техника",
  "тюнинг",
  "аварии",
  "криминал",
  "культура",
  "индустрия",
] as const;

/**
 * Один запрос на батч (до 25 позиций). Возвращает вердикты только по тем id,
 * которые модель распознала — остальные считаем «не прошло».
 */
export async function scoreBatch(
  items: FilterInput[],
  model: string,
): Promise<FilterVerdict[]> {
  if (items.length === 0) return [];

  const list = items
    .map((it, i) => {
      const age = it.ageHours == null ? "неизвестно" : `${Math.round(it.ageHours)} ч назад`;
      return `${i + 1}. [${it.sourceName} / ${it.lang} / ${age}] ${it.title}\n   ${it.summary.slice(0, 260)}`;
    })
    .join("\n");

  const user = `Оцени новости ниже. Для каждой верни объект:
{"n": номер, "score": 0-100, "hot": true|false, "topic": один из ${TOPICS.join("|")}, "reason": "до 8 слов почему"}

score — насколько это интересно байкерам клуба (см. правила). Будь строгим: реклама, подборки и не-мото — ниже 30.

Ответ: {"items":[...]} и ничего больше.

НОВОСТИ:
${list}`;

  const { answer } = await chatCompletion({
    model,
    messages: [
      { role: "system", content: FILTER_SYSTEM },
      { role: "user", content: user },
    ],
    temperature: 0.1,
    maxTokens: 2200,
    jsonMode: true,
  });

  const parsed = parseJsonLoose(answer) as { items?: unknown[] } | unknown[] | null;
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed!.items! : [];

  const out: FilterVerdict[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const n = Number(o.n ?? o.index ?? o.i);
    const item = items[n - 1];
    if (!item) continue;
    const score = Math.max(0, Math.min(100, Math.round(Number(o.score) || 0)));
    const topicRaw = String(o.topic ?? "").toLowerCase().trim();
    out.push({
      id: item.id,
      score,
      hot: o.hot === true || o.hot === "true",
      topic: (TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : "",
      reason: String(o.reason ?? "").slice(0, 200),
    });
  }
  return out;
}
