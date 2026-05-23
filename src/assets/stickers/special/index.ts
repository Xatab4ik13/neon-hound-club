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

export const SPECIAL_PACK_STICKERS: string[] = [
  s01, s02, s03, s04, s05, s07, s09, s11, s12, s13,
];

export const SPECIAL_PACK_COVER = s01;
