import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, PlumpSearch as SearchIcon, PlumpClose as X } from "@/components/ui/icons";
import { StickerView } from "@/components/club/StickerView";
import { haptic } from "@/hooks/use-haptic";
import { useMyStickerPacks, STICKER_PACK_PRODUCT_SLUGS } from "@/lib/stickers-api";
import { SPECIAL_PACK, SPECIAL_PACK_STICKERS, SPECIAL_PACK_COVER, type StickerMeta } from "@/assets/stickers/special";
import { HELL_MINIONS_PACK, HELL_MINIONS_STICKERS, HELL_MINIONS_COVER } from "@/assets/stickers/hell-minions";

/** Префикс-маркер: текст комментария = стикер-картинка (legacy-формат до Этапа A). */
const STICKER_PREFIX = "::sticker::";
export const asStickerText = (url: string) => `${STICKER_PREFIX}${url}`;
export const parseSticker = (text: string): string | null =>
  text.startsWith(STICKER_PREFIX) ? text.slice(STICKER_PREFIX.length) : null;

export type StickerPack = {
  id: string;
  title: string;
  cover: string; // emoji-cover ИЛИ url картинки
  coverIsImage?: boolean;
  stickers: string[]; // emoji-строка ИЛИ "::sticker::<url>"
  /** Метаданные стикеров для поиска и a11y (порядок совпадает со `stickers`). */
  meta?: StickerMeta[];
  /** Если задан — пак закрыт, пока юзер не купит товар с этим slug в магазине. */
  lockSlug?: string;
  /** Slug товара в магазине для покупки (используется в ссылке "Купить"). */
  productSlug?: string;
  /** Цена в рублях — для подписи на оверлее. */
  priceRub?: number;
};

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "hell-minions",
    title: "Hell Minions",
    cover: HELL_MINIONS_COVER,
    coverIsImage: true,
    stickers: HELL_MINIONS_STICKERS.map(asStickerText),
    meta: HELL_MINIONS_PACK,
    lockSlug: "hell-minions",
    productSlug: STICKER_PACK_PRODUCT_SLUGS["hell-minions"],
    priceRub: 300,
  },
  {
    id: "special",
    title: "Special pack",
    cover: SPECIAL_PACK_COVER,
    coverIsImage: true,
    stickers: SPECIAL_PACK_STICKERS.map(asStickerText),
    meta: SPECIAL_PACK,
    lockSlug: "special",
    productSlug: STICKER_PACK_PRODUCT_SLUGS.special,
    priceRub: 300,
  },
];

const STICKER_URL_TO_PACK: Map<string, StickerPack> = (() => {
  const m = new Map<string, StickerPack>();
  for (const p of STICKER_PACKS) {
    for (const s of p.stickers) {
      const u = parseSticker(s) ?? s;
      if (!m.has(u)) m.set(u, p);
    }
  }
  return m;
})();

export function findPackByStickerUrl(url: string): StickerPack | undefined {
  return STICKER_URL_TO_PACK.get(url);
}

export const RECENT_STICKERS_KEY = "club:recent-stickers";

export function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_STICKERS_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 24) : [];
  } catch {
    return [];
  }
}

export function saveRecent(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_STICKERS_KEY, JSON.stringify(list.slice(0, 24)));
  } catch {
    /* noop */
  }
}

export type StickerTab = "recent" | "emoji" | "stickers";

export function StickerPanel({
  tab,
  setTab,
  activePack,
  setActivePack,
  large = false,
  recent,
  ownedPacks,
  onPickEmoji: _onPickEmoji,
  onPickSticker,
}: {
  tab: StickerTab;
  setTab: (t: StickerTab) => void;
  activePack: string;
  setActivePack: (id: string) => void;
  large?: boolean;
  recent: string[];
  ownedPacks: string[];
  onPickEmoji: (e: string) => void;
  onPickSticker: (s: string) => void;
}) {
  const pack = STICKER_PACKS.find((p) => p.id === activePack) ?? STICKER_PACKS[0];
  const isLocked = !!pack.lockSlug && !ownedPacks.includes(pack.lockSlug);

  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{ url: string; alt: string } | null>(null);

  // Очищать поиск при смене пака — иначе сбивает с толку.
  useEffect(() => {
    setQuery("");
  }, [activePack, tab]);

  // Фильтр по тегам/alt пака. Если пак без `meta` — фильтрация выключена.
  const filteredIndices = useMemo<number[] | null>(() => {
    const q = query.trim().toLowerCase();
    if (!q || !pack.meta) return null;
    return pack.meta
      .map((m, i) => ({ i, m }))
      .filter(({ m }) => m.alt.toLowerCase().includes(q) || m.tags.some((t) => t.includes(q)))
      .map(({ i }) => i);
  }, [query, pack.meta]);

  const handlePick = (s: string) => {
    haptic("selection");
    onPickSticker(s);
  };

  // Long-press preview для стикеров (Telegram-style).
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePressStart = (url: string, alt: string) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      haptic("selection");
      setPreview({ url, alt });
    }, 380);
  };
  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className={`relative flex flex-col bg-[#0d0d0d] ${large ? "h-[min(70vh,560px)]" : "h-[min(55vh,420px)]"}`}>
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-2">
          <SearchIcon size={14} className="text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск стикеров"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Очистить поиск"
              className="text-muted-foreground/70 hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {tab === "stickers" ? (
          <>
            <div className="sticky top-0 z-10 -mx-2 mb-1 flex items-baseline gap-2 bg-[#0d0d0d]/95 px-3 pt-1 pb-2 backdrop-blur">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                {pack.title}
              </h3>
              <span className="text-[11px] text-muted-foreground/70">
                {filteredIndices
                  ? `${filteredIndices.length} из ${pack.stickers.length}`
                  : `${pack.stickers.length} стикеров`}
              </span>
            </div>
            {filteredIndices && filteredIndices.length === 0 ? (
              <div className="grid h-32 place-items-center px-6 text-center text-[12px] text-muted-foreground/60">
                Ничего не нашлось по «{query}»
              </div>
            ) : (
              <div className="relative">
                <div
                  className={`grid gap-1 ${large ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-5 sm:grid-cols-6"} ${isLocked ? "pointer-events-none select-none blur-[3px] opacity-60" : ""}`}
                >
                  {(filteredIndices ?? pack.stickers.map((_, i) => i)).map((i) => {
                    const s = pack.stickers[i];
                    const url = parseSticker(s);
                    const alt = pack.meta?.[i]?.alt ?? "стикер";
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isLocked}
                        onClick={() => handlePick(s)}
                        onTouchStart={() => url && handlePressStart(url, alt)}
                        onTouchEnd={handlePressEnd}
                        onTouchMove={handlePressEnd}
                        onTouchCancel={handlePressEnd}
                        onPointerDown={(e) => {
                          if (e.pointerType === "mouse" || !url) return;
                          handlePressStart(url, alt);
                        }}
                        onPointerUp={handlePressEnd}
                        onPointerLeave={handlePressEnd}
                        onContextMenu={(e) => {
                          if (!url) return;
                          e.preventDefault();
                          setPreview({ url, alt });
                        }}
                        aria-label={alt}
                        className={`grid aspect-square place-items-center rounded-lg transition-transform active:scale-90 hover:bg-white/[0.04] ${url ? "p-1.5" : large ? "text-6xl sm:text-7xl" : "text-4xl sm:text-[40px]"}`}
                      >
                        {url ? (
                          <StickerView url={url} alt={alt} preview className="h-full w-full select-none object-contain" />
                        ) : (
                          <span>{s}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {isLocked && (
                  <div className="absolute inset-0 z-20 grid place-items-center px-4">
                    <div className="flex max-w-[280px] flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/80 px-5 py-4 text-center shadow-xl backdrop-blur">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                        Закрытый пак
                      </div>
                      <div className="text-[13px] leading-snug text-foreground/90">
                        {pack.title} открывается после покупки в магазине.
                      </div>
                      {pack.productSlug && (
                        <Link
                          to="/club/shop/$productSlug"
                          params={{ productSlug: pack.productSlug }}
                          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-1.5 text-[12px] font-semibold text-primary-foreground"
                        >
                          Купить{pack.priceRub ? ` · ${pack.priceRub} ₽` : ""}
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : recent.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center text-[12px] text-muted-foreground/60">
            Здесь появятся стикеры, которые ты используешь
          </div>
        ) : (
          <div className={`grid gap-1 pt-1 ${large ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-5 sm:grid-cols-6"}`}>
            {recent.map((s, i) => {
              const url = parseSticker(s);
              return (
                <button
                  key={`${s}-${i}`}
                  type="button"
                  onClick={() => handlePick(s)}
                  onTouchStart={() => url && handlePressStart(url, "стикер")}
                  onTouchEnd={handlePressEnd}
                  onTouchMove={handlePressEnd}
                  onTouchCancel={handlePressEnd}
                  onContextMenu={(e) => {
                    if (!url) return;
                    e.preventDefault();
                    setPreview({ url, alt: "стикер" });
                  }}
                  className={`grid aspect-square place-items-center rounded-lg transition-transform active:scale-90 hover:bg-white/[0.04] ${url ? "p-1.5" : large ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"}`}
                >
                  {url ? (
                    <StickerView url={url} alt="стикер" preview className="h-full w-full select-none object-contain" />
                  ) : (
                    <span>{s}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom bar: pack tabs (Telegram-style) */}
      <div className="flex items-center gap-0.5 border-t border-white/[0.06] bg-black/40 px-1.5 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <PanelTab
          active={tab === "recent"}
          onClick={() => setTab("recent")}
          icon={<Clock size={18} />}
        />

        <div className="mx-1 h-5 w-px bg-white/[0.08]" />

        <div className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none">
          {STICKER_PACKS.map((p) => {
            const isActive = tab === "stickers" && activePack === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setTab("stickers");
                  setActivePack(p.id);
                }}
                aria-label={p.title}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[20px] transition-colors ${
                  isActive ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                }`}
              >
                {p.coverIsImage ? (
                  <StickerView
                    url={p.cover}
                    alt=""
                    size={28}
                    preview
                    className="h-7 w-7 select-none object-contain"
                  />
                ) : (
                  p.cover
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Long-press preview overlay (Telegram-style) */}
      {preview && (
        <div
          className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-black/55 backdrop-blur-sm animate-in fade-in-0 duration-150"
          aria-hidden
        >
          <StickerView
            url={preview.url}
            alt={preview.alt}
            size={224}
            className="h-56 w-56 select-none object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
          />
          <style>{`
            @keyframes sticker-preview-in {
              0%   { transform: scale(0.7); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function PanelTab({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
        active ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );
}
