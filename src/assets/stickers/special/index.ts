// Special pack — рисованные стикеры HELLHOUND.
// PNG → WebP 512×512, ~18-21 KB каждый. Грузятся параллельно через Vite hash-урлы.

import s01 from "./01.webp";
import s02 from "./02.webp";
import s03 from "./03.webp";
import s04 from "./04.webp";
import s05 from "./05.webp";
import s07 from "./07.webp";
import s09 from "./09.webp";
import s11 from "./11.webp";
import s12 from "./12.webp";
import s13 from "./13.webp";

/**
 * Метаданные стикеров пака — нужны для поиска и для accessibility (alt).
 * `tags` — нижний регистр, ru/en, разделять не нужно (фильтр идёт по includes).
 */
export type StickerMeta = {
  url: string;
  alt: string;
  tags: string[];
};

export const SPECIAL_PACK: StickerMeta[] = [
  { url: s01, alt: "Hellhound — пёс с языком",        tags: ["hell", "пёс", "собака", "язык", "dog"] },
  { url: s02, alt: "Hellhound — злой пёс",              tags: ["hell", "злой", "angry", "rage"] },
  { url: s03, alt: "Hellhound — лайк",                  tags: ["лайк", "like", "thumbs", "ok", "вверх"] },
  { url: s04, alt: "Hellhound — череп",                 tags: ["череп", "skull", "death"] },
  { url: s05, alt: "Hellhound — огонь",                 tags: ["огонь", "fire", "пламя", "hot"] },
  { url: s07, alt: "Hellhound — поклон",                tags: ["respect", "поклон", "уважение", "bow"] },
  { url: s09, alt: "Hellhound — крутой",                tags: ["крутой", "cool", "glasses", "swag"] },
  { url: s11, alt: "Hellhound — мото",                  tags: ["мото", "moto", "bike", "байк", "racing"] },
  { url: s12, alt: "Hellhound — смех",                  tags: ["смех", "lol", "laugh", "haha"] },
  { url: s13, alt: "Hellhound — сердце",                tags: ["love", "сердце", "heart", "❤"] },
];

/** Только URL-ы — для обратной совместимости с местами, где не нужны метаданные. */
export const SPECIAL_PACK_STICKERS: string[] = SPECIAL_PACK.map((s) => s.url);

import cover from "./cover.webp";

// Превью-обложка пака (сетка 3×3 из стикеров) — лёгкий webp ~50 KB.
export const SPECIAL_PACK_COVER = cover;
