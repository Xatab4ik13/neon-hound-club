// Сбор новостей из RSS + вытягивание картинки/полного текста со страницы.
// Без тяжёлых зависимостей: fast-xml-parser + регулярки по HTML.
import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";
import { fetch as undiciFetch, ProxyAgent, type Dispatcher } from "undici";

const UA =
  "Mozilla/5.0 (compatible; HellhoundNewsBot/1.0; +https://hhr.pro)";

// Часть источников (JP/CN) может быть недоступна с RU-IP. Если задан
// NEWS_PROXY_URL — ходим через него; иначе напрямую.
let proxyAgent: Dispatcher | null | undefined;
function dispatcher(): Dispatcher | undefined {
  if (proxyAgent === undefined) {
    const url = process.env.NEWS_PROXY_URL?.trim();
    proxyAgent = url ? new ProxyAgent(url) : null;
  }
  return proxyAgent ?? undefined;
}

async function httpGet(url: string, timeoutMs = 15_000): Promise<string> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const d = dispatcher();
    const init = {
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: ac.signal,
      ...(d ? { dispatcher: d } : {}),
    } as never;
    const res = await (d ? undiciFetch(url, init) : (fetch(url, init as never) as never));
    const r = res as unknown as Response;
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

export type RawItem = {
  url: string;
  title: string;
  summary: string;
  image: string | null;
  publishedAt: Date | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function textOf(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["#text"] === "string") return o["#text"];
  }
  return "";
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function firstImageFrom(entry: Record<string, unknown>): string | null {
  const enc = asArray(entry.enclosure as never)[0] as Record<string, unknown> | undefined;
  const encUrl = enc?.["@_url"];
  if (typeof encUrl === "string" && /^https?:/i.test(encUrl)) return encUrl;

  const media = asArray(entry["media:content"] as never)[0] as Record<string, unknown> | undefined;
  const mUrl = media?.["@_url"];
  if (typeof mUrl === "string" && /^https?:/i.test(mUrl)) return mUrl;

  const thumb = asArray(entry["media:thumbnail"] as never)[0] as Record<string, unknown> | undefined;
  const tUrl = thumb?.["@_url"];
  if (typeof tUrl === "string" && /^https?:/i.test(tUrl)) return tUrl;

  const html = `${textOf(entry.description)}${textOf(entry["content:encoded"])}`;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] && /^https?:/i.test(m[1]) ? m[1] : null;
}

function parseDate(v: unknown): Date | null {
  const s = textOf(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Забирает и парсит один фид. RSS 2.0 и Atom. */
export async function fetchFeed(feedUrl: string): Promise<RawItem[]> {
  const xml = await httpGet(feedUrl);
  const doc = parser.parse(xml) as Record<string, any>;

  const rssItems = asArray(doc?.rss?.channel?.item);
  const rdfItems = asArray(doc?.["rdf:RDF"]?.item);
  const atomItems = asArray(doc?.feed?.entry);
  const entries = [...rssItems, ...rdfItems, ...atomItems] as Record<string, unknown>[];

  const out: RawItem[] = [];
  for (const e of entries) {
    // ссылка: RSS <link>text</link> | Atom <link href="">
    let link = textOf(e.link);
    if (!link) {
      const l = asArray(e.link as never)[0] as Record<string, unknown> | undefined;
      const href = l?.["@_href"];
      if (typeof href === "string") link = href;
    }
    if (!link) link = textOf(e.guid);
    link = link.trim();
    if (!/^https?:\/\//i.test(link)) continue;

    const title = stripHtml(textOf(e.title));
    if (!title) continue;

    const summary = stripHtml(
      textOf(e.description) || textOf(e.summary) || textOf(e["content:encoded"]) || textOf(e.content),
    ).slice(0, 1200);

    out.push({
      url: link.split("#")[0],
      title,
      summary,
      image: firstImageFrom(e),
      publishedAt:
        parseDate(e.pubDate) ?? parseDate(e.published) ?? parseDate(e.updated) ?? parseDate(e["dc:date"]),
    });
  }
  return out;
}

/** Нормализованный хеш заголовка для дедупа «одна новость на 5 сайтах». */
export function titleHash(title: string): string {
  const norm = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 3)
    .sort()
    .slice(0, 8)
    .join(" ");
  return createHash("sha256").update(norm).digest("hex").slice(0, 32);
}

export type ArticleExtract = { text: string; image: string | null };

/** Полный текст статьи + og:image со страницы. Тихо деградирует до пустого. */
export async function extractArticle(url: string): Promise<ArticleExtract> {
  let html = "";
  try {
    html = await httpGet(url, 18_000);
  } catch {
    return { text: "", image: null };
  }

  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ??
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  let image = ogMatch?.[1] ?? null;
  if (image && image.startsWith("//")) image = `https:${image}`;
  if (image && !/^https?:/i.test(image)) image = null;

  // Текст: собираем <p> из тела статьи, отбрасываем короткий мусор.
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripHtml(m[1]))
    .filter((p) => p.length > 60);
  const text = paragraphs.join("\n\n").slice(0, 6000);

  return { text, image };
}

// ─── Telegram-каналы ────────────────────────────────────────────────
// У Telegram нет RSS, но публичная веб-версия канала (t.me/s/<name>)
// отдаёт последние посты обычным HTML. Парсим её как фид.

/** Извлекает имя канала из ссылки t.me/<name> или t.me/s/<name>. */
export function telegramChannel(url: string): string | null {
  const m = url.match(/^https?:\/\/t\.me\/(?:s\/)?(@?[A-Za-z0-9_]{4,64})\/?$/i);
  return m ? m[1].replace(/^@/, "") : null;
}

export function isTelegramSource(url: string): boolean {
  return telegramChannel(url) !== null;
}

function tgText(block: string): string {
  const m = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (!m) return "";
  return stripHtml(m[1].replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n"))
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** Читает публичный Telegram-канал как фид. */
export async function fetchTelegramChannel(url: string): Promise<RawItem[]> {
  const channel = telegramChannel(url);
  if (!channel) throw new Error("не похоже на ссылку канала t.me");
  const html = await httpGet(`https://t.me/s/${channel}`, 20_000);

  const blocks = html.split("tgme_widget_message_wrap").slice(1);
  const out: RawItem[] = [];
  for (const b of blocks) {
    const post = b.match(/data-post="([^"]+)"/)?.[1];
    if (!post) continue;

    const body = tgText(b);
    if (body.length < 20) continue; // пустые пересылки и «реклама»

    // Картинка: фото поста или превью видео.
    const img = b.match(/background-image:url\('([^']+)'\)/)?.[1] ?? null;

    const dt = b.match(/<time[^>]+datetime="([^"]+)"/)?.[1];
    const publishedAt = dt ? new Date(dt) : null;

    const firstLine = body.split("\n").find((l) => l.trim().length > 10) ?? body;
    out.push({
      url: `https://t.me/${post}`,
      title: firstLine.trim().slice(0, 180),
      summary: body.slice(0, 1200),
      image: img && /^https?:/i.test(img) ? img : null,
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    });
  }
  // В вебе посты идут от старых к новым — переворачиваем.
  return out.reverse();
}

/** Единая точка: RSS или Telegram-канал, в зависимости от ссылки. */
export async function fetchSource(url: string): Promise<RawItem[]> {
  return isTelegramSource(url) ? fetchTelegramChannel(url) : fetchFeed(url);
}
