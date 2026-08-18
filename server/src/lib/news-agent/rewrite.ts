// Рерайт новости на русский в двух вариантах: сухой и с эмоцией.
import { chatCompletion } from "../openrouter.js";
import { parseJsonLoose } from "./filter.js";

export type RewriteResult = {
  category: string;
  variants: { tone: "plain" | "punchy"; title: string; text: string }[];
};

export async function rewriteCandidate(
  input: {
    title: string;
    text: string;
    sourceName: string;
    lang: string;
    topic: string;
  },
  opts: { model: string; prompt: string },
): Promise<RewriteResult> {
  const source = `ИСТОЧНИК: ${input.sourceName} (язык: ${input.lang})
ЗАГОЛОВОК ОРИГИНАЛА: ${input.title}
ТЕМА: ${input.topic || "мото"}

ТЕКСТ ОРИГИНАЛА:
${input.text.slice(0, 5000)}`;

  const user = `${source}

Сделай ДВА варианта поста на русском по одной и той же новости:
1) tone "plain" — сухой информативный: только факты, без оценок.
2) tone "punchy" — тот же факт, но живее: с крючком в первой строке и авторским отношением. Без кликбейта и без вымысла.

Верни строго JSON:
{"category":"одно слово по-русски, например Новинки/Гонки/Техника/Тюнинг/Аварии/Криминал/Культура/Индустрия",
 "variants":[{"tone":"plain","title":"...","text":"..."},{"tone":"punchy","title":"...","text":"..."}]}

Без markdown-обёртки, без комментариев.`;

  // Два варианта текста — это много токенов. Тесный лимит = обрезанный JSON
  // или пустой content у «думающих» моделей. Плюс один повтор при сбое.
  let answer = "";
  let lastErr: unknown = null;
  for (const attempt of [0, 1]) {
    try {
      const res = await chatCompletion({
        model: opts.model,
        messages: [
          { role: "system", content: opts.prompt },
          { role: "user", content: user },
        ],
        temperature: attempt === 0 ? 0.7 : 0.4,
        maxTokens: 8000,
        jsonMode: true,
      });
      answer = res.answer;
      if (answer.trim()) break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!answer.trim()) throw lastErr ?? new Error("Пустой ответ от модели");

  const parsed = parseJsonLoose(answer) as Record<string, unknown> | null;
  const rawVariants = Array.isArray(parsed?.variants) ? (parsed!.variants as unknown[]) : [];


  const variants: RewriteResult["variants"] = [];
  for (const v of rawVariants) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const title = String(o.title ?? "").trim().slice(0, 200);
    const text = String(o.text ?? "").trim().slice(0, 6000);
    if (!title || !text) continue;
    variants.push({
      tone: String(o.tone) === "punchy" ? "punchy" : "plain",
      title,
      text,
    });
    if (variants.length === 2) break;
  }

  if (variants.length === 0) throw new Error("Модель не вернула ни одного варианта текста");
  // если пришёл только один вариант — не падаем, отдаём как есть
  if (variants.length === 2 && variants[0].tone === variants[1].tone) variants[1].tone = "punchy";

  const category = String(parsed?.category ?? "").trim().slice(0, 60);
  return { category, variants };
}
