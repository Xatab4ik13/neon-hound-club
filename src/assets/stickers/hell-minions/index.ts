// Hell Minions pack — анимированные .tgs стикеры из Telegram.
// Рендерятся через TgSticker (pako + lottie-web), как в Telegram.
import type { StickerMeta } from "../special";

import s0 from "./0.tgs.asset.json";
import s1 from "./1.tgs.asset.json";
import s2 from "./2.tgs.asset.json";
import s3 from "./3.tgs.asset.json";
import s4 from "./4.tgs.asset.json";
import s5 from "./5.tgs.asset.json";
import s6 from "./6.tgs.asset.json";
import s7 from "./7.tgs.asset.json";
import s8 from "./8.tgs.asset.json";
import s9 from "./9.tgs.asset.json";
import s10 from "./10.tgs.asset.json";
import s11 from "./11.tgs.asset.json";
import s12 from "./12.tgs.asset.json";
import s13 from "./13.tgs.asset.json";
import s14 from "./14.tgs.asset.json";
import s15 from "./15.tgs.asset.json";
import s16 from "./16.tgs.asset.json";
import s17 from "./17.tgs.asset.json";
import s18 from "./18.tgs.asset.json";
import s19 from "./19.tgs.asset.json";
import s20 from "./20.tgs.asset.json";
import s21 from "./21.tgs.asset.json";
import s22 from "./22.tgs.asset.json";
import s23 from "./23.tgs.asset.json";
import s24 from "./24.tgs.asset.json";
import s25 from "./25.tgs.asset.json";
import s26 from "./26.tgs.asset.json";

const ALL = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24, s25, s26];

export const HELL_MINIONS_PACK: StickerMeta[] = ALL.map((a, i) => ({
  url: a.url,
  alt: `Hell Minion #${i + 1}`,
  tags: ["minion", "миньон", "hell"],
}));

export const HELL_MINIONS_STICKERS: string[] = HELL_MINIONS_PACK.map((s) => s.url);

// Cover пака — первый стикер (анимированный .tgs, рендерится через TgSticker).
export const HELL_MINIONS_COVER: string = ALL[0].url;
