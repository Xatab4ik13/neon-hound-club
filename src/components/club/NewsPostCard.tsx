// Карточка новостного поста для вкладки NEWS в /club.
// Визуально повторяет PostCard из club.index.tsx, но:
//   - вместо аватарки/ника — Plump-бейдж «NEWS» + категория
//   - лайки в локальном сторе (mockNewsStore), бэкенда пока нет
//   - комментарии — заглушка (toast), сгружаем счётчик, поведение подключим когда придёт бэкенд
//
// Ширина/радиусы/паддинги специально совпадают с PostCard, чтобы при переключении
// вкладок не «прыгал» скелет.

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Heart, PlumpComment, PlumpShare } from "@/components/ui/icons";
import { LikeButton } from "@/components/club/LikeButton";
import { Swipeable } from "@/components/club/Swipeable";
import { RelativeTime } from "@/components/club/RelativeTime";
import { ImageViewer } from "@/components/club/ImageViewer";
import { haptic } from "@/hooks/use-haptic";
import { hhToast } from "@/lib/hh-toast";
import { mockNewsStore, type NewsPost } from "@/data/mock-news";
import { NewsCommentsSheet } from "@/components/club/NewsCommentsSheet";

// Салатовый — фирменный цвет NEWS-ленты (согласовано с юзером)
const NEWS_COLOR = "#B6FF3C";

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return Math.round(n / 1000) + "k";
}

export function NewsRow({ post }: { post: NewsPost }) {
  return (
    <Swipeable
      radius={24}
      right={{
        icon: <Heart className="h-4 w-4" fill="currentColor" />,
        label: post.liked ? "Лайк убран" : "Лайк",
        bg: "linear-gradient(90deg, oklch(0.62 0.24 357.3) 0%, oklch(0.55 0.22 357.3) 100%)",
        fg: "#fff",
        onAction: () => mockNewsStore.toggleLike(post.id, !post.liked),
      }}
    >
      <NewsPostCard post={post} />
    </Swipeable>
  );
}

function NewsPostCard({ post }: { post: NewsPost }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerEverOpened, setViewerEverOpened] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsEverOpened, setCommentsEverOpened] = useState(false);

  const openComments = useCallback(() => {
    haptic("light");
    setCommentsEverOpened(true);
    setCommentsOpen(true);
  }, []);

  // Тап по «свободному» месту карточки → открыть комментарии.
  // Игнорируем клики по интерактивным детям (кнопки, ссылки, инпуты, формы, картинка).
  const onCardClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("button,a,input,form,textarea,select,[role='button']")) return;
      openComments();
    },
    [openComments],
  );

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/club#news-${post.id}` : `/club`;

  const handleShare = useCallback(async () => {
    haptic("light");
    const text = `NEWS · ${post.category} — HELLHOUND`;
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({ title: text, url: shareUrl });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      hhToast.success("Ссылка скопирована");
    } catch {
      hhToast.error("Не удалось скопировать");
    }
  }, [shareUrl, post.category]);

  const openViewer = useCallback(() => {
    const run = () =>
      flushSync(() => {
        setViewerEverOpened(true);
        setViewerOpen(true);
      });
    const d =
      typeof document !== "undefined"
        ? (document as Document & { startViewTransition?: (cb: () => void) => unknown })
        : null;
    if (d?.startViewTransition) d.startViewTransition(run);
    else run();
  }, []);

  const closeViewer = useCallback(() => {
    const run = () => flushSync(() => setViewerOpen(false));
    const d =
      typeof document !== "undefined"
        ? (document as Document & { startViewTransition?: (cb: () => void) => unknown })
        : null;
    if (d?.startViewTransition) d.startViewTransition(run);
    else run();
  }, []);

  // Дабл-тап по картинке = лайк
  const lastImgTap = useRef(0);
  const onImageTap = useCallback(() => {
    const now = Date.now();
    if (now - lastImgTap.current < 280) {
      if (!post.liked) {
        haptic("success");
        mockNewsStore.toggleLike(post.id, true);
      }
      lastImgTap.current = 0;
    } else {
      lastImgTap.current = now;
      setTimeout(() => {
        if (lastImgTap.current === now) openViewer();
      }, 290);
    }
  }, [post.liked, post.id, openViewer]);

  return (
    <>
      <article
        className="post-card relative overflow-visible rounded-[24px] border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition-colors hover:border-white/[0.10]"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.18 0.015 280 / 0.85) 0%, oklch(0.14 0.01 280 / 0.85) 55%, oklch(0.12 0.008 280 / 0.9) 100%)",
        }}
      >
        <div className="overflow-hidden rounded-[24px]">
          {/* Header: Plump-бейдж NEWS вместо аватарки */}
          <header className="flex items-center gap-3 px-4 pt-4 md:px-5 md:pt-5">
            <div
              className="inline-flex h-8 shrink-0 items-center rounded-[10px] px-4"
              style={{ background: NEWS_COLOR }}
            >
              <span className="font-display text-[15px] font-black uppercase leading-none tracking-[0.14em] text-black">
                NEWS
              </span>
            </div>


            <div className="min-w-0 flex-1">
              <RelativeTime
                iso={post.createdAt}
                className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] tabular-nums text-muted-foreground"
              />
            </div>

          </header>

          {/* Заголовок новости — жирным, крупнее чем body */}
          <h2 className="px-4 pb-1 pt-3 font-display text-[18px] font-black leading-tight tracking-tight text-foreground md:px-5">
            {post.title}
          </h2>

          {/* Текст */}
          {post.text && (
            <p className="whitespace-pre-wrap break-words px-4 pb-3 pt-2 text-[15px] leading-[1.55] text-foreground/90 md:px-5">
              {post.text}
            </p>
          )}

          {/* Картинка */}
          {post.image && (
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={onImageTap}
                aria-label="Открыть картинку"
                className="block w-full overflow-hidden rounded-[16px] border border-white/[0.05] bg-black active:opacity-95"
              >
                <img
                  src={post.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  // @ts-expect-error — нестандартный, но поддерживается
                  fetchpriority="low"
                  draggable={false}
                  className="aspect-[16/9] w-full select-none object-cover"
                  style={{ viewTransitionName: viewerOpen ? undefined : `news-img-${post.id}` }}
                />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-3 md:px-5">
            <LikeButton
              liked={post.liked}
              count={post.likes}
              onToggle={(next: boolean) => mockNewsStore.toggleLike(post.id, next)}
              accent={NEWS_COLOR}
            />


            <button
              type="button"
              onClick={() => hhToast.info("Комментарии подключим скоро")}
              aria-label="Комментарий"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-[12px] font-bold tabular-nums text-foreground transition-all active:scale-95"
              style={{ color: NEWS_COLOR }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = NEWS_COLOR)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
            >
              <PlumpComment className="h-4 w-4" />
              <span>{formatCount(post.commentsCount)}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Поделиться"
              className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] transition-colors active:scale-95"
              style={{ color: NEWS_COLOR }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = NEWS_COLOR)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
            >
              <PlumpShare className="h-4 w-4" />
            </button>

          </div>
        </div>
      </article>

      {post.image && viewerEverOpened && (
        <ImageViewer
          src={post.image}
          open={viewerOpen}
          transitionName={`news-img-${post.id}`}
          onClose={closeViewer}
          onDoubleTap={() => {
            if (!post.liked) {
              haptic("success");
              mockNewsStore.toggleLike(post.id, true);
            }
          }}
        />
      )}
    </>
  );
}
