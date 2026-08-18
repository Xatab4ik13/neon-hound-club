import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { flushSync } from "react-dom";
import { Send, PlumpSearch as SearchIcon, Clock, PlumpSticker as Sticker, PlumpClose as X, Pin, PinOff, Trash2, Heart, PlumpImage as ImageIcon, PlumpCamera as Camera, PlumpComment, PlumpShare, PlumpPoll, PlumpAttach } from "@/components/ui/icons";
import { RANKS, type RankId } from "@/data/ranks";
import { useFeedPosts, useFeedLoaded, feedStore, initialsOf, makeSlug, type FeedAuthor, type FeedComment, type FeedPost, type FeedPoll } from "@/data/feed-store";
import { HellhoundAvatar, HellhoundChip } from "@/components/club/HellhoundPlaque";
import { IOSConfirm } from "@/components/ios/IOSConfirm";
import { AdaptiveSheet } from "@/components/club/AdaptiveSheet";
import { AdaptiveActionSheet } from "@/components/club/AdaptiveActionSheet";
import type { ActionSheetItem } from "@/components/club/AdaptiveActionSheet";
import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile } from "@/lib/garage-api";
import { useMyStickerPacks } from "@/lib/stickers-api";
import { StickerView, type StickerViewHandle } from "@/components/club/StickerView";
import {
  StickerPanel,
  loadRecent,
  saveRecent,
  STICKER_PACKS,
  parseSticker,
  findPackByStickerUrl,
  type StickerTab,
} from "@/components/club/StickerPanel";
import { FeedHeroCarousel } from "@/components/club/FeedHeroCarousel";
import { FeedTabs, useFeedTab } from "@/components/club/FeedTabs";
import { NewsRow } from "@/components/club/NewsPostCard";
import { useNewsPosts } from "@/lib/news-api";
import { LikeButton, REACTIONS, type Reaction } from "@/components/club/LikeButton";
import { ImageViewer } from "@/components/club/ImageViewer";
import { PostSkeleton } from "@/components/club/PostSkeleton";
import { ReactionsBar } from "@/components/club/ReactionsBar";
import { CommentReactionsBar } from "@/components/club/CommentReactionsBar";
import { commentReactionsStore } from "@/data/comment-reactions-store";
import { FeedSentinel } from "@/components/club/FeedSentinel";
import { Swipeable } from "@/components/club/Swipeable";
import { reactionsStore } from "@/data/reactions-store";
import { hhToast } from "@/lib/hh-toast";
import { haptic } from "@/hooks/use-haptic";
import { RelativeTime } from "@/components/club/RelativeTime";
import { CommentsSheet, UserLink, RankAvatar } from "@/components/club/CommentsSheet";
import { isClubHost, isStandalone, clubUrl } from "@/lib/host";




export const Route = createFileRoute("/club/")({
  head: () => ({
    meta: [
      { title: "Клуб HELLHOUND — лента" },
      { name: "description", content: "Лента клуба HELLHOUND Racing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubFeedPage,
});

type Comment = FeedComment;
type Post = FeedPost;

const RANK_BY_ID = Object.fromEntries(RANKS.map((r) => [r.id, r])) as Record<
  RankId,
  (typeof RANKS)[number]
>;

// ───────── Page ─────────

function ClubFeedPage() {
  const posts = useFeedPosts();
  const loaded = useFeedLoaded();
  const { isAuthed, hydrated } = useViewer();
  const showSkeleton = !loaded && posts.length === 0;

  const [tab, setTab] = useFeedTab();
  const newsQuery = useNewsPosts();
  const newsPosts = newsQuery.data ?? [];
  const newsLoading = newsQuery.isLoading;

  // Внутри уже установленной PWA НИКОГДА не уводим на другой origin —
  // iOS откроет cross-origin в встроенном Safari (видны адресная строка
  // и кнопки браузера). Поддоменная история — только до установки,
  // в обычном браузере; этим занимается редирект после логина.

  // 2) На club.hhr.pro неавторизованных уводим на /login.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isClubHost()) return;
    if (!hydrated) return;
    if (!isAuthed) window.location.replace("/login");
  }, [hydrated, isAuthed]);

  return (
    <main className="mx-auto w-full max-w-[640px] px-3 py-5 md:px-4 md:py-10">
      <div className="mb-4 flex items-center justify-between px-2">
        <h1 className="font-display text-2xl font-black uppercase leading-none tracking-tight text-foreground">
          Лента
        </h1>
      </div>

      <FeedTabs tab={tab} onChange={setTab} />

      <div className="md:hidden">
        <FeedHeroCarousel accent={tab === "news" ? "#B6FF3C" : "#F000C0"} />
      </div>


      <div className="space-y-5">
        {tab === "hellhound" ? (
          showSkeleton ? (
            <>
              <PostSkeleton withImage />
              <PostSkeleton />
              <PostSkeleton withImage />
            </>
          ) : (
            <>
              {posts.map((post) => (
                <FeedRow key={post.id} post={post} />
              ))}
              {posts.length > 0 && <FeedSentinel />}
            </>
          )
        ) : (
          <>
            {newsLoading && newsPosts.length === 0 ? (
              <>
                <PostSkeleton withImage />
                <PostSkeleton />
              </>
            ) : newsPosts.length === 0 ? (
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-8 text-center text-[13px] text-muted-foreground">
                Пока новостей нет.
              </div>
            ) : (
              newsPosts.map((n) => <NewsRow key={n.id} post={n} />)
            )}
          </>
        )}
      </div>
    </main>
  );
}

// Отдельный мемо-компонент — стабильный prop для Swipeable
const FeedRow = memo(function FeedRow({ post }: { post: Post }) {
  const right = useMemo(
    () => ({
      icon: <Heart className="h-4 w-4" fill="currentColor" />,
      label: post.liked ? "Лайк убран" : "Лайк",
      bg: "linear-gradient(90deg, oklch(0.62 0.24 357.3) 0%, oklch(0.55 0.22 357.3) 100%)",
      fg: "#fff",
      onAction: () => feedStore.toggleLike(post.id, !post.liked),
    }),
    [post.id, post.liked],
  );
  return (
    <Swipeable radius={24} right={right}>
      <PostCard post={post} />
    </Swipeable>
  );
});

// ───────── Post ─────────

export const PostCard = memo(function PostCard({ post, moderate = false }: { post: Post; moderate?: boolean }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsEverOpened, setCommentsEverOpened] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerEverOpened, setViewerEverOpened] = useState(false);
  const navigate = useNavigate();
  const liked = post.liked;
  const likeCount = post.likes;
  const author = post.author;
  const authorIsBlogger = author.isBlogger;

  const postUrl = typeof window !== "undefined" ? `${window.location.origin}/club/p/${post.id}` : `/club/p/${post.id}`;

  const handleShare = useCallback(async () => {
    haptic("light");
    const text = author?.nick ? `${author.nick} — HELLHOUND` : "HELLHOUND";
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({ title: text, url: postUrl });
        return;
      } catch (e) {
        // пользователь отменил — молча
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(postUrl);
      hhToast.success("Ссылка скопирована");
    } catch {
      hhToast.error("Не удалось скопировать");
    }
  }, [postUrl, author?.nick]);

  const openPost = useCallback(() => {
    navigate({ to: "/club/p/$postId", params: { postId: post.id } });
  }, [navigate, post.id]);

  // Тап по «свободному» месту карточки → открыть пост.
  // Игнорируем клики по интерактивным детям (кнопки, ссылки, инпуты, формы).
  const onCardClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button,a,input,form,textarea,select,[role='button']")) return;
    openPost();
  }, [openPost]);

  // Открытие fullscreen-вьюера — через View Transitions API, если есть.
  // Браузер snapshot-ит исходную картинку и плавно «летит» в фуллскрин
  // (shared-element). Где API нет — просто открываем.
  const openViewer = useCallback(() => {
    const run = () => flushSync(() => { setViewerEverOpened(true); setViewerOpen(true); });
    const d = typeof document !== "undefined" ? (document as Document & { startViewTransition?: (cb: () => void) => unknown }) : null;
    if (d?.startViewTransition) d.startViewTransition(run);
    else run();
  }, []);

  const closeViewer = useCallback(() => {
    const run = () => flushSync(() => setViewerOpen(false));
    const d = typeof document !== "undefined" ? (document as Document & { startViewTransition?: (cb: () => void) => unknown }) : null;
    if (d?.startViewTransition) d.startViewTransition(run);
    else run();
  }, []);

  // Дабл-тап по картинке = лайк (если ещё не лайкнут).
  const lastImgTap = useRef(0);
  const onImageTap = useCallback(() => {
    const now = Date.now();
    if (now - lastImgTap.current < 280) {
      if (!liked) {
        haptic("success");
        feedStore.toggleLike(post.id, true);
      }
      lastImgTap.current = 0;
    } else {
      lastImgTap.current = now;
      // Одиночный тап с задержкой — откроем вьюер, если за это время не пришёл второй.
      setTimeout(() => {
        if (lastImgTap.current === now) openViewer();
      }, 290);
    }
  }, [liked, post.id, openViewer]);



  return (
    <>
    <article
      onClick={onCardClick}
      className={`post-card relative cursor-pointer overflow-visible rounded-[24px] border shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition-colors ${
        post.pinned
          ? "border-primary/40 hover:border-primary/60"
          : "border-white/[0.06] hover:border-white/[0.10]"
      }`}
      style={
        post.pinned
          ? {
              background:
                "linear-gradient(155deg, oklch(0.22 0.09 357.3 / 0.55) 0%, oklch(0.16 0.05 357.3 / 0.45) 38%, oklch(0.14 0.01 280 / 0.6) 100%)",
              boxShadow:
                "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 32px -8px oklch(0.62 0.24 357.3 / 0.35)",
            }
          : {
              background:
                "linear-gradient(160deg, oklch(0.18 0.015 280 / 0.85) 0%, oklch(0.14 0.01 280 / 0.85) 55%, oklch(0.12 0.008 280 / 0.9) 100%)",
            }
      }
    >
      {(() => {
        // Priority: ОПРОС > ЗАКРЕП (один чип). В правом верхнем углу — не клиппается и не перекрывает аватар.
        if (post.poll) {
          return (
            <div className="pointer-events-none absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-md border border-primary/50 bg-[oklch(0.18_0.08_357.3)] px-2 py-1 font-mono text-[9px] font-black uppercase leading-none tracking-[0.18em] text-primary shadow-[0_4px_12px_rgba(0,0,0,0.45)]">
              <PlumpPoll className="h-2.5 w-2.5" />
              Опрос
            </div>
          );
        }
        if (post.pinned) {
          return (
            <div className="pointer-events-none absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-md border border-primary/50 bg-[oklch(0.18_0.08_357.3)] px-2 py-1 font-mono text-[9px] font-black uppercase leading-none tracking-[0.18em] text-primary shadow-[0_4px_12px_rgba(0,0,0,0.45)]">
              <Pin className="h-2.5 w-2.5" strokeWidth={2.8} />
              Закреп
            </div>
          );
        }
        return null;
      })()}



      <div className="overflow-hidden rounded-[24px]">

      <header className="flex items-center gap-3 px-4 pt-4 md:px-5 md:pt-5">
        <UserLink
          slug={author.slug}
          disabled={authorIsBlogger}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {authorIsBlogger ? (
            <HellhoundAvatar size={44} initials={author.initials} avatarUrl={author.avatarUrl} />
          ) : (
            <RankAvatar
              initials={author.initials}
              rankId={(author.rankId as RankId) ?? "rookie"}
              avatarUrl={author.avatarUrl}
              size={44}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-display text-[15px] font-black uppercase  tracking-tight text-foreground">
                {author.nick}
              </span>
              
            </div>
            <RelativeTime
              iso={post.createdAt}
              fallback={post.time}
              className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] tabular-nums text-muted-foreground"
            />
          </div>
        </UserLink>
        {moderate && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => feedStore.updatePost(post.id, { pinned: !post.pinned })}
              aria-label={post.pinned ? "Открепить" : "Закрепить"}
              title={post.pinned ? "Открепить" : "Закрепить"}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {post.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => feedStore.removePost(post.id)}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Удалить
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  aria-label="Отмена"
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Удалить пост"
                title="Удалить пост"
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </header>


      {post.text && (
        <p className="whitespace-pre-wrap break-words px-4 pb-3 pt-3 text-[15px] leading-[1.55] text-foreground/90 md:px-5">{post.text}</p>
      )}

      {post.poll && <PollBlock poll={post.poll} postId={post.id} />}


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
              // @ts-expect-error — нестандартный, но поддерживается Chromium/Safari
              fetchpriority="low"
              draggable={false}
              className="aspect-[16/9] w-full select-none object-cover"
              style={{ viewTransitionName: viewerOpen ? undefined : `post-img-${post.id}` }}
            />
          </button>
        </div>
      )}


      <div className="flex items-center gap-2 px-4 py-3 md:px-5">
        <LikeButton
          liked={liked}
          count={likeCount}
          onToggle={(next: boolean) => feedStore.toggleLike(post.id, next)}
          onReact={(r) => reactionsStore.set(post.id, r)}
        />



        <button
          type="button"
          onClick={() => { setCommentsEverOpened(true); setCommentsOpen(true); }}
          aria-label="Комментарий"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-[12px] font-bold tabular-nums text-foreground transition-all hover:border-primary/40 hover:text-primary active:scale-95"
        >
          <PlumpComment className="h-4 w-4" />
          <span>{formatCount(post.commentsCount)}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Поделиться"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-95"
        >
          <PlumpShare className="h-4 w-4" />
        </button>
      </div>

      <ReactionsBar postId={post.id} />



      <CommentsPreview
        comments={post.comments}
        totalCount={post.commentsCount}
        onOpen={() => { setCommentsEverOpened(true); setCommentsOpen(true); }}
      />
      </div>
    </article>

    {commentsEverOpened && (
      <CommentsSheet
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        post={post}
        moderate={moderate}
      />
    )}

    {post.image && viewerEverOpened && (
      <ImageViewer
        src={post.image}
        open={viewerOpen}
        transitionName={`post-img-${post.id}`}
        onClose={closeViewer}
        onDoubleTap={() => {
          if (!liked) {
            haptic("success");
            feedStore.toggleLike(post.id, true);
          }
        }}
      />
    )}
    </>
  );
});

// ───────── Poll ─────────

function PollBlock({ poll, postId }: { poll: FeedPoll; postId: string }) {
  const voted = poll.myVote && poll.myVote.length > 0 ? poll.myVote[0] : null;
  const totals = poll.options.reduce((s, o) => s + o.votes, 0);

  const onVote = (id: string) => {
    if (poll.closed) return;
    feedStore.votePoll(postId, [id]);
  };

  const onRetract = () => {
    feedStore.unvotePoll(postId);
  };

  const showResults = !!voted || !!poll.closed;


  return (
    <div className="mx-3 mb-3 rounded-[16px] border border-white/[0.06] bg-black/30 p-4 md:mx-4 md:p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-display text-[15px] font-black uppercase  leading-tight tracking-tight text-foreground">
          {poll.question}
        </h3>
        {poll.closed && (
          <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Закрыто
          </span>
        )}
      </div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {poll.anonymous ? "Анонимный опрос" : "Открытый опрос"}
        {poll.multi ? " · можно несколько" : ""}
      </p>

      <ul className="space-y-2">
        {poll.options.map((opt) => {
          const votes = opt.votes;
          const pct = totals > 0 ? Math.round((votes / totals) * 100) : 0;
          const isMine = voted === opt.id;


          if (!showResults) {
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => onVote(opt.id)}
                  className="group flex w-full items-center gap-3 rounded-[12px] border border-white/[0.08] bg-card/40 px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] active:scale-[0.99]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/20 transition-colors group-hover:border-primary" />
                  <span className="flex-1 text-[14px] leading-tight text-foreground/90">
                    {opt.text}
                  </span>
                </button>
              </li>
            );
          }

          return (
            <li key={opt.id} className="relative">
              <div className="relative overflow-hidden rounded-[12px] border border-white/[0.06] bg-black/40 px-3 py-2.5">
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-[12px]"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isMine
                      ? "color-mix(in oklab, var(--primary) 22%, transparent)"
                      : "rgba(255,255,255,0.05)",
                    transition: "width 400ms ease-out",
                  }}
                />
                <div className="relative flex items-center gap-3">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      isMine ? "border-primary bg-primary" : "border-white/20"
                    }`}
                  >
                    {isMine && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-primary-foreground">
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 truncate text-[14px] text-foreground/95">
                    {opt.text}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[12px] font-bold tabular-nums ${
                      isMine ? "text-primary" : "text-foreground/80"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>
          <span className="font-bold text-foreground/80 tabular-nums">{totals}</span>{" "}
          {totalsLabel(totals)}
        </span>
        {voted && !poll.closed && (
          <button
            type="button"
            onClick={onRetract}
            className="font-bold tracking-[0.2em] text-primary transition-opacity hover:opacity-80"
          >
            Отменить голос
          </button>
        )}
      </div>
    </div>
  );
}

function totalsLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "голос";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "голоса";
  return "голосов";
}



function PostAction({
  icon,
  count,
  label,
  active,
  onClick,
  compact,
}: {
  icon: React.ReactNode;
  count?: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`group flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wider tabular-nums transition-colors ${
        active
          ? "text-primary"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
      }`}
    >
      <span className="transition-transform group-active:scale-90">{icon}</span>
      {count !== undefined ? (
        <span>{formatCount(count)}</span>
      ) : compact ? null : (
        <span>{label}</span>
      )}
    </button>
  );
}


// ───────── Comments preview (под постом) ─────────

const CommentsPreview = memo(function CommentsPreview({
  comments,
  totalCount,
  onOpen,
}: {
  comments: Comment[];
  totalCount: number;
  onOpen: () => void;
}) {
  if (totalCount === 0) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 px-4 pb-4 pt-1 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary md:px-5"
      >
        Написать комментарий →
      </button>
    );
  }
  const last = comments[comments.length - 1];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 px-4 pb-4 pt-1 text-left transition-opacity active:opacity-70 md:px-5"
    >
      {last && (
        <div className="flex gap-2.5 border-l-2 border-primary pl-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              {last.author.nick}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-foreground/85">
              {last.kind === "sticker" || last.text.startsWith("::sticker::")
                ? "🖼 Стикер"
                : last.kind === "image" || last.imageUrl
                ? last.text?.trim() ? `📷 ${last.text}` : "📷 Фото"
                : last.text}
            </div>
          </div>
        </div>
      )}
      <div className="inline-flex items-center gap-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-primary">
        Все комментарии · {totalCount}
        <span>→</span>
      </div>
    </button>
  );
});

// ───────── Utils & icons ─────────

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return String(n);
}

function HeartIcon({ filled = false, size = 18 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
    </svg>
  );
}
