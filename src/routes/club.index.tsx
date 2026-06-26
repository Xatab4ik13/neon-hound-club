import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { flushSync } from "react-dom";
import { Smile, Send, Search as SearchIcon, Clock, Sticker, X, Pin, PinOff, Trash2, BarChart3, Share2, MessageCircle, Heart } from "lucide-react";
import { RANKS, type RankId } from "@/data/ranks";
import { useFeedPosts, useFeedLoaded, feedStore, initialsOf, makeSlug, type FeedAuthor, type FeedComment, type FeedPost, type FeedPoll } from "@/data/feed-store";
import { HellhoundAvatar, HellhoundChip } from "@/components/club/HellhoundPlaque";
import { IOSSheet } from "@/components/ios/IOSSheet";
import { IOSConfirm } from "@/components/ios/IOSConfirm";
import { IOSActionSheet, type ActionSheetItem } from "@/components/ios/IOSActionSheet";
import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile } from "@/lib/garage-api";
import { useMyStickerPacks, STICKER_PACK_PRODUCT_SLUGS } from "@/lib/stickers-api";
import { SPECIAL_PACK, SPECIAL_PACK_STICKERS, SPECIAL_PACK_COVER, type StickerMeta } from "@/assets/stickers/special";
import { FeedHeroCarousel } from "@/components/club/FeedHeroCarousel";
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
  const showSkeleton = !loaded && posts.length === 0;

  return (
    <main className="mx-auto w-full max-w-[640px] px-3 py-5 md:px-4 md:py-10">
      <div className="mb-4 flex items-center justify-between px-2">
        <h1 className="font-display text-[34px] font-black uppercase italic leading-none tracking-tight text-foreground md:text-3xl">
          Лента
        </h1>
      </div>

      <div className="md:hidden">
        <FeedHeroCarousel />
      </div>

      <div className="space-y-5">
        {showSkeleton ? (
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
      bg: "linear-gradient(90deg, oklch(0.55 0.22 357.3) 0%, oklch(0.6 0.24 357.3) 100%)",
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
    <article
      onClick={onCardClick}
      className={`post-card relative cursor-pointer overflow-visible rounded-[24px] border shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition-colors ${
        post.pinned
          ? "border-primary/30 hover:border-primary/50"
          : "border-white/[0.06] hover:border-white/[0.10]"
      }`}
      style={
        post.pinned
          ? {
              background:
                "linear-gradient(155deg, oklch(0.22 0.09 357.3 / 0.55) 0%, oklch(0.16 0.05 357.3 / 0.45) 38%, oklch(0.14 0.01 280 / 0.6) 100%)",
              boxShadow:
                "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 32px -8px rgba(255,45,149,0.35)",
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
              <BarChart3 className="h-2.5 w-2.5" strokeWidth={2.8} />
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
              <span className="truncate font-display text-[15px] font-black uppercase italic tracking-tight text-foreground">
                {author.nick}
              </span>
              {authorIsBlogger && <HellhoundChip size="sm" />}
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
        <p className="px-4 pb-3 pt-3 text-[15px] leading-[1.55] text-foreground/90 md:px-5">{post.text}</p>
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
          <MessageCircle className="h-4 w-4" strokeWidth={2} />
          <span>{formatCount(post.commentsCount)}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Поделиться"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-95"
        >
          <Share2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <ReactionsBar postId={post.id} />



      <CommentsPreview
        comments={post.comments}
        totalCount={post.commentsCount}
        onOpen={() => { setCommentsEverOpened(true); setCommentsOpen(true); }}
      />
      </div>

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
    </article>
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
        <h3 className="font-display text-[15px] font-black uppercase italic leading-tight tracking-tight text-foreground">
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
              {last.text.startsWith("::sticker::") ? "🖼 Стикер" : last.text}
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

// ───────── Comments sheet (Telegram-style full-screen) ─────────

function CommentsSheet({
  open,
  onOpenChange,
  post,
  moderate = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  post: Post;
  moderate?: boolean;
}) {
  const [replyTo, setReplyTo] = useState<{ nick: string; commentId: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<Comment | null>(null);
  const [reactionFor, setReactionFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const viewer = useViewer();
  const myId = viewer.user?.id ?? null;

  const listRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef<number>(post.comments.length);
  const scrolledToTargetRef = useRef<string | null>(null);
  // Метка «последнего прочтения» (ms) — фиксируется при открытии шита.
  // Всё, что новее, рисуем под разделителем «Новые».
  const [lastReadAt, setLastReadAt] = useState<number>(0);
  const lastReadStorageKey = `hh:lastRead:${post.id}`;
  // ID последнего отправленного мной комментария — для fly-in анимации.
  const [justSentId, setJustSentId] = useState<string | null>(null);


  // сбросить состояние при закрытии; при открытии — подгрузить полный список
  useEffect(() => {
    if (!open) {
      setReplyTo(null);
      setActionTarget(null);
      setReactionFor(null);
      setEditingId(null);
      setHighlightId(null);
      setJustSentId(null);
      scrolledToTargetRef.current = null;
      // На закрытии запоминаем «прочитано до сейчас».
      try { localStorage.setItem(lastReadStorageKey, String(Date.now())); } catch {}
      return;
    }
    try {
      const raw = localStorage.getItem(lastReadStorageKey);
      setLastReadAt(raw ? Number(raw) || 0 : 0);
    } catch { setLastReadAt(0); }
    if (!post.commentsFull) {
      feedStore.loadFullComments(post.id);
    }
  }, [open, post.id, post.commentsFull, lastReadStorageKey]);

  // Deep-link на коммент: ?c=<commentId>. Скроллим + подсвечиваем пульсом.
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get("c");
    if (!target) return;
    if (scrolledToTargetRef.current === target) return;
    const exists = post.comments.some((c) => c.id === target);
    if (!exists) return; // подождём подгрузки full
    scrolledToTargetRef.current = target;
    // Подождём кадр чтобы DOM устоялся
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-comment-id="${CSS.escape(target)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(target);
        setTimeout(() => setHighlightId(null), 1800);
      }
    });
  }, [open, post.comments]);

  // Авто-скролл к низу + fly-in анимация, когда юзер отправил свой коммент.
  useEffect(() => {
    if (!open) return;
    const prev = prevCountRef.current;
    const next = post.comments.length;
    if (next > prev) {
      const last = post.comments[post.comments.length - 1];
      const isMine = myId != null && last && last.author.id === myId;
      if (isMine && last) {
        setJustSentId(last.id);
        // снимаем подсветку после анимации
        setTimeout(() => setJustSentId((id) => (id === last.id ? null : id)), 600);
        if (listRef.current) {
          requestAnimationFrame(() => {
            if (listRef.current) {
              listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
            }
          });
        }
      }
    }
    prevCountRef.current = next;
  }, [open, post.comments, myId]);

  // Группировка ответов в треды. Источник истины — comment.parentId.
  // Для legacy без parentId — fallback на эвристику «текст начинается с @nick».
  const { topLevel, childrenByParentId, knownNicks } = useMemo<{
    topLevel: Comment[];
    childrenByParentId: Map<string, Comment[]>;
    knownNicks: Set<string>;
  }>(() => {
    const childrenByParentId = new Map<string, Comment[]>();
    const topLevel: Comment[] = [];
    const nickToLatest = new Map<string, string>();
    const knownNicks = new Set<string>();
    if (post.author?.nick) knownNicks.add(post.author.nick.toLowerCase());
    for (const c of post.comments) {
      let parentId: string | undefined = c.parentId ?? undefined;
      if (!parentId) {
        const m = c.text.match(/^@(\S+)\s/);
        if (m) parentId = nickToLatest.get(m[1].toLowerCase());
      }
      if (parentId && childrenByParentId.get(parentId) === undefined && !post.comments.some((x) => x.id === parentId)) {
        parentId = undefined;
      }
      if (parentId) {
        const arr = childrenByParentId.get(parentId) ?? [];
        arr.push(c);
        childrenByParentId.set(parentId, arr);
      } else {
        topLevel.push(c);
      }
      nickToLatest.set(c.author.nick.toLowerCase(), c.id);
      knownNicks.add(c.author.nick.toLowerCase());
    }
    return { topLevel, childrenByParentId, knownNicks };
  }, [post.comments, post.author?.nick]);

  // Первый «непрочитанный» top-level комментарий (не мой, новее lastReadAt).
  // Над ним отрисуется разделитель «Новые».
  const firstUnreadId = useMemo<string | null>(() => {
    if (!lastReadAt) return null;
    for (const c of topLevel) {
      if (myId && c.author.id === myId) continue;
      const t = c.createdAt ? new Date(c.createdAt).getTime() : 0;
      if (t > lastReadAt) return c.id;
    }
    return null;
  }, [topLevel, lastReadAt, myId]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stripReplyPrefix = (text: string) => text.replace(/^@\S+\s+/, "");

  // Действия из action-sheet
  const handleReply = (c: Comment) => {
    setReplyTo({ nick: c.author.nick, commentId: c.id });
  };
  const handleCopy = async (c: Comment) => {
    const text = getCommentStickerUrl(c) ? "(стикер)" : c.text;
    try {
      await navigator.clipboard.writeText(text);
      hhToast.success("Скопировано");
    } catch {
      hhToast.error("Не удалось скопировать");
    }
  };
  const handleReport = (_c: Comment) => {
    hhToast.success("Жалоба отправлена. Спасибо.");
  };
  const handleEdit = (c: Comment) => {
    setEditingId(c.id);
  };
  const handleSaveEdit = async (commentId: string, nextText: string) => {
    const trimmed = nextText.trim();
    if (!trimmed) return;
    setEditingId(null);
    await feedStore.editComment(post.id, commentId, trimmed);
  };

  const buildActionItems = (c: Comment): ActionSheetItem[] => {
    const isMine = myId != null && c.author.id === myId;
    const canDelete = isMine || moderate;
    const isSticker = !!getCommentStickerUrl(c);
    const items: ActionSheetItem[] = [
      { key: "reply", label: "Ответить", onSelect: () => handleReply(c) },
      { key: "react", label: "Реакция", onSelect: () => setReactionFor(c.id) },
    ];
    if (!isSticker) {
      items.push({ key: "copy", label: "Копировать текст", onSelect: () => handleCopy(c) });
    }
    if (isMine && !isSticker) {
      items.push({ key: "edit", label: "Изменить", onSelect: () => handleEdit(c) });
    }
    if (!isMine) {
      items.push({ key: "report", label: "Пожаловаться", onSelect: () => handleReport(c) });
    }
    if (canDelete) {
      items.push({
        key: "delete",
        label: "Удалить",
        destructive: true,
        onSelect: () => setPendingDelete(c.id),
      });
    }
    return items;
  };

  const renderItem = (c: Comment, isReply = false) => {
    const isMine = myId != null && c.author.id === myId;
    const canDelete = isMine || moderate;

    const item = (
      <CommentItem
        key={c.id}
        comment={isReply ? { ...c, text: stripReplyPrefix(c.text) } : c}
        knownNicks={knownNicks}
        large
        editing={editingId === c.id}
        onSaveEdit={(text) => handleSaveEdit(c.id, text)}
        onCancelEdit={() => setEditingId(null)}
        onReply={() => handleReply(c)}
        onLongPress={() => setActionTarget(c)}
        onMore={() => setActionTarget(c)}
      />
    );

    if (!canDelete) return item;

    return (
      <Swipeable
        key={c.id}
        radius={12}
        left={{
          icon: <Trash2 className="h-4 w-4" />,
          label: "Удалить",
          bg: "linear-gradient(90deg, oklch(0.4 0.18 27) 0%, oklch(0.5 0.22 27) 100%)",
          onAction: () => setPendingDelete(c.id),
        }}
      >
        {item}
      </Swipeable>
    );
  };

  return (
    <IOSSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Комментарии · ${post.commentsCount}`}
      fullHeight
      contentClassName="!p-0 !overflow-hidden flex flex-col min-h-0"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {post.commentsCount === 0 ? (
            <div className="grid h-full place-items-center text-[13px] text-muted-foreground">
              Будь первым — оставь комментарий
            </div>
          ) : !post.commentsFull && post.commentsCount > post.comments.length ? (
            <CommentSkeletonList count={Math.min(5, post.commentsCount)} />
          ) : (
            <ul className="space-y-5">
              {topLevel.map((c) => {
                const children = childrenByParentId.get(c.id) ?? [];
                const isCollapsed = collapsed.has(c.id);
                const isHi = highlightId === c.id;
                const isJustSent = justSentId === c.id;
                const isUnreadAnchor = firstUnreadId === c.id;
                return (
                  <Fragment key={c.id}>
                    {isUnreadAnchor && (
                      <li
                        aria-hidden="true"
                        className="!my-3 flex items-center gap-2 px-1"
                      >
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/40" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                          Новые
                        </span>
                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/40" />
                      </li>
                    )}
                    <li
                      data-comment-id={c.id}
                      className={`space-y-3 rounded-2xl transition-colors ${isHi ? "ring-2 ring-primary/60 bg-primary/[0.04]" : ""}`}
                      style={
                        isJustSent
                          ? { animation: "comment-flyin 480ms cubic-bezier(.22,1,.36,1)" }
                          : isHi
                            ? { animation: "comment-highlight 1.8s ease-out" }
                            : undefined
                      }
                    >
                      <ul>{renderItem(c)}</ul>
                      {children.length > 0 && (
                        <div className="pl-12">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(c.id)}
                            className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70 transition-colors hover:text-foreground"
                          >
                            <span className="h-px w-6 bg-white/15" />
                            {isCollapsed
                              ? `Показать ответы · ${children.length}`
                              : `Скрыть ответы · ${children.length}`}
                          </button>
                          {!isCollapsed && (
                            <ul className="space-y-4">
                              {children.map((child) => {
                                const isChildHi = highlightId === child.id;
                                const isChildJustSent = justSentId === child.id;
                                return (
                                  <div
                                    key={child.id}
                                    data-comment-id={child.id}
                                    className={`rounded-2xl transition-colors ${isChildHi ? "ring-2 ring-primary/60 bg-primary/[0.04]" : ""}`}
                                    style={
                                      isChildJustSent
                                        ? { animation: "comment-flyin 480ms cubic-bezier(.22,1,.36,1)" }
                                        : isChildHi
                                          ? { animation: "comment-highlight 1.8s ease-out" }
                                          : undefined
                                    }
                                  >
                                    {renderItem(child, true)}
                                  </div>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          )}
          <style>{`
            @keyframes comment-highlight {
              0%   { background-color: rgba(255,45,149,0.18); }
              100% { background-color: transparent; }
            }
            @keyframes comment-flyin {
              0%   { opacity: 0; transform: translateY(14px) scale(0.985); }
              60%  { opacity: 1; }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @media (prefers-reduced-motion: reduce) {
              [style*="comment-highlight"], [style*="comment-flyin"] { animation: none !important; }
            }
          `}</style>
        </div>
        <div className="shrink-0 border-t border-white/[0.06] bg-[#0d0d0d]">
          <CommentComposer
            postId={post.id}
            knownNicks={knownNicks}
            large
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
          />
        </div>
      </div>

      <IOSConfirm
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Удалить комментарий?"
        description="Это действие нельзя отменить."
        confirmLabel="Удалить"
        destructive
        onConfirm={() => {
          if (pendingDelete) feedStore.removeComment(post.id, pendingDelete);
          setPendingDelete(null);
        }}
      />

      {/* Главный action-sheet — открывается по long-press / кнопке «…» */}
      <IOSActionSheet
        open={actionTarget !== null}
        onOpenChange={(v) => !v && setActionTarget(null)}
        items={actionTarget ? buildActionItems(actionTarget) : []}
      />

      {/* Выбор реакции — горизонтальный ряд из 5 эмодзи */}
      <IOSActionSheet
        open={reactionFor !== null}
        onOpenChange={(v) => !v && setReactionFor(null)}
        title="Реакция"
        variant="emojiRow"
        items={REACTIONS.map<ActionSheetItem>((r) => ({
          key: r,
          label: r,
          onSelect: () => {
            if (reactionFor) commentReactionsStore.toggle(reactionFor, r as Reaction);
          },
        }))}
      />
    </IOSSheet>
  );
}

// Скелетон списка комментов на момент подгрузки full.
function CommentSkeletonList({ count }: { count: number }) {
  return (
    <ul className="space-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.05]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[min(70%,260px)] animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="h-4 w-[min(50%,200px)] animate-pulse rounded-2xl bg-white/[0.04]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ───────── Comment item ─────────



const CommentItem = memo(function CommentItem({
  comment,
  knownNicks,
  large = false,
  editing = false,
  onReply,
  onSaveEdit,
  onCancelEdit,
  onLongPress,
  onMore,
}: {
  comment: Comment;
  /** Если задан — только эти @nick рендерятся как кликабельные ссылки. */
  knownNicks?: Set<string>;
  large?: boolean;
  editing?: boolean;
  onReply?: () => void;
  onSaveEdit?: (text: string) => void;
  onCancelEdit?: () => void;
  /** Долгий тап — открыть action-sheet. */
  onLongPress?: () => void;
  /** Клик по «…» — тот же action-sheet. */
  onMore?: () => void;
}) {
  const liked = comment.liked;
  const author = comment.author;
  const rank = RANK_BY_ID[(author.rankId as RankId) ?? "rookie"] ?? RANK_BY_ID["rookie"];
  const count = comment.likes;
  const authorIsBlogger = author.isBlogger;
  const stickerUrl = getCommentStickerUrl(comment);

  // Локальный текст для inline-edit
  const [draft, setDraft] = useState(comment.text);
  useEffect(() => {
    if (editing) setDraft(comment.text);
  }, [editing, comment.text]);

  // Long-press detection (touch). На десктопе — contextmenu.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const handlePressStart = useCallback(() => {
    if (!onLongPress) return;
    longPressedRef.current = false;
    pressTimer.current = setTimeout(() => {
      longPressedRef.current = true;
      haptic("selection");
      onLongPress();
    }, 380);
  }, [onLongPress]);
  const handlePressEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!onLongPress) return;
      e.preventDefault();
      onLongPress();
    },
    [onLongPress],
  );

  return (
    <li className="flex gap-3">
      <UserLink slug={author.slug} disabled={authorIsBlogger}>
        {authorIsBlogger ? (
          <HellhoundAvatar size={large ? 40 : 36} initials={author.initials} avatarUrl={author.avatarUrl} />
        ) : (
          <RankAvatar
            initials={author.initials}
            rankId={(author.rankId as RankId) ?? "rookie"}
            avatarUrl={author.avatarUrl}
            size={large ? 40 : 36}
          />
        )}
      </UserLink>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <UserLink slug={author.slug} disabled={authorIsBlogger} className="min-w-0 truncate">
            <span
              className={`truncate font-display font-bold uppercase italic tracking-tight transition-opacity hover:opacity-80 ${large ? "text-[14px]" : "text-[13px]"}`}
              style={{ color: authorIsBlogger ? undefined : rank.accent }}
            >
              {author.nick}
            </span>
          </UserLink>
          {authorIsBlogger ? (
            <HellhoundChip size="xs" />
          ) : (
            <span
              className="shrink-0 rounded-md border px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider"
              style={{ color: rank.accent, borderColor: rank.accentSoft, background: `${rank.accent}10` }}
            >
              {rank.short}
            </span>
          )}
          <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {comment.time}
            {comment.editedAt && (
              <span className="ml-1 text-muted-foreground/50 normal-case tracking-normal" title="Изменено">
                · изм.
              </span>
            )}
          </span>
        </div>

        {editing && !stickerUrl ? (
          <div className="mt-1.5">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelEdit?.();
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onSaveEdit?.(draft);
                }
              }}
              rows={Math.min(5, Math.max(2, draft.split("\n").length))}
              maxLength={2000}
              className="w-full resize-none rounded-2xl border border-primary/40 bg-white/[0.04] px-3 py-2 text-[14px] leading-relaxed text-foreground/95 outline-none focus:border-primary/70"
            />
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSaveEdit?.(draft)}
                disabled={!draft.trim() || draft.trim() === comment.text.trim()}
                className="rounded-full bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary-foreground transition-opacity disabled:opacity-40"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 transition-colors hover:text-foreground"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : stickerUrl ? (
          <div
            className="mt-1 select-none"
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchMove={handlePressEnd}
            onTouchCancel={handlePressEnd}
            onContextMenu={handleContextMenu}
          >
            <img
              src={stickerUrl}
              alt="стикер"
              loading="lazy"
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              className="h-48 w-48 select-none object-contain md:h-52 md:w-52"
            />
          </div>
        ) : (
          <div
            className="mt-1 inline-block max-w-full select-text rounded-2xl rounded-tl-sm border border-white/[0.05] bg-white/[0.03] px-3 py-2"
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchMove={handlePressEnd}
            onTouchCancel={handlePressEnd}
            onContextMenu={handleContextMenu}
          >
            <p className={`break-words leading-relaxed text-foreground/90 ${large ? "text-[14.5px]" : "text-[13.5px]"}`}>
              {renderCommentText(comment.text, knownNicks)}
            </p>
          </div>
        )}

        <CommentReactionsBar commentId={comment.id} />

        <div className="mt-1.5 flex items-center gap-4 pl-1">
          <button
            type="button"
            onClick={() => {
              feedStore.toggleCommentLike(comment.id, !liked);
            }}
            aria-pressed={liked}
            className={`flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider tabular-nums transition-colors ${
              liked ? "text-primary" : "text-muted-foreground/70 hover:text-primary"
            }`}
          >
            <HeartIcon filled={liked} size={12} />
            <span>{count}</span>
          </button>

          <button
            type="button"
            onClick={onReply}
            className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground active:opacity-60"
          >
            Ответить
          </button>
          {onMore && (
            <button
              type="button"
              onClick={onMore}
              aria-label="Действия"
              title="Действия"
              className="ml-auto inline-flex h-6 items-center justify-center rounded-full px-2 font-mono text-[14px] leading-none text-muted-foreground/60 transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              ···
            </button>
          )}
        </div>
      </div>
    </li>
  );
});



function UserLink({
  slug,
  disabled = false,
  children,
  className = "",
}: {
  slug: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (disabled) {
    return <span className={`shrink-0 ${className}`}>{children}</span>;
  }
  return (
    <Link
      to="/club/u/$nick"
      params={{ nick: slug }}
      className={`shrink-0 ${className}`}
    >
      {children}
    </Link>
  );
}

function RankAvatar({
  initials,
  rankId,
  avatarUrl,
  size = 36,
}: {
  initials: string;
  rankId: RankId;
  avatarUrl?: string;
  size?: number;
}) {
  const rank = RANK_BY_ID[rankId];
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        height: size,
        width: size,
        boxShadow: `0 0 0 1px ${rank.accentSoft}`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{ border: `1px solid ${rank.accent}`, opacity: 0.85 }}
      />
      <div
        aria-hidden
        className="absolute inset-0 rounded-full opacity-20"
        style={{
          background: `linear-gradient(135deg, ${rank.accent} 0%, transparent 70%)`,
        }}
      />

      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          className="relative font-display font-black uppercase italic"
          style={{ color: rank.accent, fontSize: Math.round(size * 0.32) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

// Mock packs — позже заменим на данные из БД

/** Префикс-маркер: текст комментария = стикер-картинка (legacy-формат до Этапа A). */
const STICKER_PREFIX = "::sticker::";
const asStickerText = (url: string) => `${STICKER_PREFIX}${url}`;
const parseSticker = (text: string): string | null =>
  text.startsWith(STICKER_PREFIX) ? text.slice(STICKER_PREFIX.length) : null;

/** Достаёт url стикера из коммента вне зависимости от формата (новый kind/stickerId или legacy ::sticker::). */
function getCommentStickerUrl(c: Comment): string | null {
  if (c.kind === "sticker" && c.stickerId) return c.stickerId;
  return parseSticker(c.text);
}

/** Регулярка для меншенов @nick — только латиница/цифры/подчёркивание, 2–32 символа. */
const MENTION_RE = /@([a-zA-Z0-9_]{2,32})/g;

/**
 * Рендерит текст коммента, превращая @nick в кликабельные ссылки на /club/u/:nick.
 * Принимает callback-фильтр: если nick есть в списке известных — ссылка, иначе обычный текст.
 */
function renderCommentText(text: string, knownNicks?: Set<string>): React.ReactNode {
  if (!text) return text;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    const start = m.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    const nick = m[1];
    const isKnown = !knownNicks || knownNicks.has(nick.toLowerCase());
    if (isKnown) {
      parts.push(
        <Link
          key={`m-${start}`}
          to="/club/u/$nick"
          params={{ nick: makeSlug(nick) || nick }}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{nick}
        </Link>,
      );
    } else {
      parts.push(m[0]);
    }
    last = start + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}


type StickerPack = {
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

const STICKER_PACKS: StickerPack[] = [
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

const RECENT_STICKERS_KEY = "club:recent-stickers";

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_STICKERS_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 24) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_STICKERS_KEY, JSON.stringify(list.slice(0, 24)));
  } catch {
    /* noop */
  }
}

// Лимит длины коммента (бэк: max 2000). Покажем счётчик начиная с этого порога.
const COMMENT_MAX = 2000;
const COMMENT_COUNTER_THRESHOLD = 1800;
// Анти-флуд: интервал между двумя сабмитами в одном композере.
const COMMENT_MIN_INTERVAL_MS = 600;

function CommentComposer({
  postId,
  knownNicks,
  large = false,
  replyTo,
  onClearReply,
}: {
  postId: string;
  /** Список ников, которых можно меншенить (для автокомплита) — обычно участники треда. */
  knownNicks?: Set<string>;
  large?: boolean;
  replyTo?: { nick: string; commentId: string } | null;
  onClearReply?: () => void;
}) {
  const [value, setValue] = useState("");
  const [panel, setPanel] = useState<null | "emoji" | "stickers">(null);
  const [tab, setTab] = useState<"recent" | "emoji" | "stickers">("stickers");
  const [activePack, setActivePack] = useState<string>(STICKER_PACKS[0].id);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [submitting, setSubmitting] = useState(false);
  const viewer = useViewer();
  const myProfileQ = useMyProfile();
  const myProfile = myProfileQ.data;
  const ownedPacksQ = useMyStickerPacks(!!myProfile);
  const ownedPacks = ownedPacksQ.data ?? [];
  const meNick = myProfile?.nick ?? viewer.nick ?? "";
  const meInitials = initialsOf(meNick);
  const meRank = (myProfile?.rank?.rankId as RankId | undefined) ?? "rookie";
  const meAvatar = myProfile?.avatarUrl ?? undefined;
  const meIsBlogger = myProfile?.role === "blogger";
  const meId = viewer.user?.id ?? "";
  const trimmed = value.trim();
  const overLimit = value.length > COMMENT_MAX;
  const disabled = trimmed.length === 0 || overLimit || submitting;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSentAt = useRef(0);

  const meAuthor = useMemo<FeedAuthor>(
    () => ({
      id: meId,
      slug: makeSlug(meNick) || meId,
      nick: meNick,
      initials: meInitials,
      avatarUrl: meAvatar,
      rankId: meRank,
      role: meIsBlogger ? "blogger" : "user",
      isBlogger: meIsBlogger,
    }),
    [meId, meNick, meInitials, meAvatar, meRank, meIsBlogger],
  );

  // Когда тыкнули «Ответить» — фокус на ввод
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  // Auto-grow textarea (1 → 5 строк). Считаем по scrollHeight.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 5 * 22; // ~5 строк при line-height 22
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value]);

  // Outside-click: закрыть стикер-панель.
  useEffect(() => {
    if (!panel) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [panel]);

  const pushRecent = useCallback((s: string) => {
    setRecent((prev) => {
      const next = [s, ...prev.filter((x) => x !== s)].slice(0, 24);
      saveRecent(next);
      return next;
    });
  }, []);

  const submitText = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || clean.length > COMMENT_MAX) return;
      const now = Date.now();
      if (now - lastSentAt.current < COMMENT_MIN_INTERVAL_MS) return;
      lastSentAt.current = now;
      setSubmitting(true);
      try {
        await feedStore.addComment(postId, {
          author: meAuthor,
          text: clean,
          parentId: replyTo?.commentId,
        });
        setValue("");
        setPanel(null);
        onClearReply?.();
      } finally {
        setSubmitting(false);
      }
    },
    [postId, replyTo, onClearReply, meAuthor],
  );

  const insertEmoji = useCallback((e: string) => {
    setValue((v) => (v + e).slice(0, COMMENT_MAX));
    inputRef.current?.focus();
  }, []);

  const sendSticker = useCallback(
    async (s: string) => {
      const now = Date.now();
      if (now - lastSentAt.current < COMMENT_MIN_INTERVAL_MS) return;
      lastSentAt.current = now;
      pushRecent(s);
      // s может быть либо raw URL стикера, либо legacy "::sticker::<url>" — нормализуем.
      const stickerId = parseSticker(s) ?? s;
      setPanel(null);
      onClearReply?.();
      await feedStore.addComment(postId, {
        author: meAuthor,
        stickerId,
        parentId: replyTo?.commentId,
      });
    },
    [postId, replyTo, onClearReply, pushRecent, meAuthor],
  );

  // ───── Mention-автокомплит ─────
  // Активен, когда курсор стоит сразу после @<query> и query состоит из [a-zA-Z0-9_].
  const mention = useMemo(() => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const m = before.match(/(?:^|\s)@([a-zA-Z0-9_]{0,32})$/);
    if (!m) return null;
    const query = m[1].toLowerCase();
    const all = Array.from(knownNicks ?? []);
    const matches = all
      .filter((n) => (query ? n.startsWith(query) : true))
      .filter((n) => n !== meNick.toLowerCase())
      .slice(0, 6);
    if (matches.length === 0) return null;
    return { query, matches, startsAt: caret - m[1].length - 1 };
    // зависим от value, чтобы пересчитываться при наборе
  }, [value, knownNicks, meNick]);

  const insertMention = useCallback(
    (nick: string) => {
      const el = inputRef.current;
      const caret = el?.selectionStart ?? value.length;
      const before = value.slice(0, caret).replace(/@([a-zA-Z0-9_]{0,32})$/, `@${nick} `);
      const after = value.slice(caret);
      const next = (before + after).slice(0, COMMENT_MAX);
      setValue(next);
      requestAnimationFrame(() => {
        const newCaret = before.length;
        el?.focus();
        el?.setSelectionRange(newCaret, newCaret);
      });
    },
    [value],
  );

  return (
    <div ref={wrapRef} className="relative border-t border-white/[0.06] bg-black/40">
      {replyTo && (
        <div className="flex items-center gap-2 border-b border-white/[0.05] bg-primary/[0.06] px-4 py-2">
          <div className="h-7 w-[2px] shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
              Ответ
            </div>
            <div className="truncate text-[12px] text-foreground/80">@{replyTo.nick}</div>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            aria-label="Отменить ответ"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {mention && (
        <div className="absolute left-3 right-3 bottom-full mb-2 z-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c1c1e]/95 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {mention.matches.map((nick) => (
            <button
              key={nick}
              type="button"
              onMouseDown={(e) => {
                // mousedown (не click) чтобы не потерять фокус textarea
                e.preventDefault();
                insertMention(nick);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground/90 transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
            >
              <span className="text-muted-foreground/70">@</span>
              <span className="font-medium">{nick}</span>
            </button>
          ))}
        </div>
      )}

      {panel && (
        <StickerPanel
          tab={tab}
          setTab={setTab}
          activePack={activePack}
          setActivePack={setActivePack}
          large={large}
          recent={recent}
          ownedPacks={ownedPacks}
          onPickEmoji={insertEmoji}
          onPickSticker={sendSticker}
        />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitText(value);
        }}
        className="flex items-end gap-2 px-3 py-2.5"
      >
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl border border-white/[0.08] bg-black/60 pl-2 pr-1 py-1 focus-within:border-primary/40">
          <button
            type="button"
            onClick={() => {
              if (panel === "stickers") {
                setPanel(null);
              } else {
                setPanel("stickers");
                setTab("stickers");
              }
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Стикеры"
          >
            <Smile size={20} strokeWidth={1.6} />
          </button>

          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, COMMENT_MAX))}
            onFocus={() => setPanel(null)}
            onKeyDown={(e) => {
              // Enter = отправить, Shift+Enter = перенос строки.
              if (e.key === "Enter" && !e.shiftKey && !mention) {
                e.preventDefault();
                void submitText(value);
              }
              if (e.key === "Escape") {
                if (mention) {
                  // курсор сразу за @ → стираем @, чтобы скрыть подсказку
                  const el = inputRef.current;
                  const caret = el?.selectionStart ?? value.length;
                  setValue(value.slice(0, mention.startsAt) + value.slice(caret));
                } else if (replyTo) {
                  onClearReply?.();
                }
              }
            }}
            rows={1}
            placeholder={replyTo ? `Ответить @${replyTo.nick}…` : "Написать комментарий…"}
            className="min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] leading-[22px] text-foreground placeholder:text-muted-foreground/60 outline-none"
            style={{ maxHeight: 5 * 22 }}
          />
          {value.length >= COMMENT_COUNTER_THRESHOLD && (
            <span
              className={`mb-1.5 shrink-0 self-end font-mono text-[10px] tabular-nums ${
                overLimit ? "text-destructive" : "text-muted-foreground/60"
              }`}
              aria-live="polite"
            >
              {COMMENT_MAX - value.length}
            </span>
          )}
        </div>

        {trimmed.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              if (panel === "stickers") {
                setPanel(null);
              } else {
                setPanel("stickers");
                setTab("stickers");
              }
            }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Стикеры"
          >
            <Sticker size={22} strokeWidth={1.6} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
            aria-label="Отправить"
          >
            <Send size={18} strokeWidth={2} className="-translate-x-[1px]" />
          </button>
        )}
      </form>
    </div>
  );
}

function StickerPanel({
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
  tab: "recent" | "emoji" | "stickers";
  setTab: (t: "recent" | "emoji" | "stickers") => void;
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
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5">
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
            <div className="sticky top-0 z-10 -mx-2 mb-1 bg-[#0d0d0d]/95 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              {pack.title}
              {filteredIndices && (
                <span className="ml-2 text-muted-foreground/60 normal-case tracking-normal">
                  · {filteredIndices.length}
                </span>
              )}
            </div>
            {filteredIndices && filteredIndices.length === 0 ? (
              <div className="grid h-32 place-items-center px-6 text-center text-[12px] text-muted-foreground/60">
                Ничего не нашлось по «{query}»
              </div>
            ) : (
              <div className="relative">
                <div
                  className={`grid gap-1 ${large ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-5"} ${isLocked ? "pointer-events-none select-none blur-[3px] opacity-60" : ""}`}
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
                          <img
                            src={url}
                            alt={alt}
                            width={128}
                            height={128}
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            referrerPolicy="no-referrer"
                            className="h-full w-full select-none object-contain"
                          />
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
                        <a
                          href={`/club/shop/${pack.productSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-1.5 text-[12px] font-semibold text-primary-foreground"
                        >
                          Купить{pack.priceRub ? ` · ${pack.priceRub} ₽` : ""}
                        </a>
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
                    <img
                      src={url}
                      alt=""
                      width={128}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      referrerPolicy="no-referrer"
                      className="h-full w-full select-none object-contain"
                    />
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
      <div className="flex items-center gap-0.5 border-t border-white/[0.06] bg-black/40 px-1.5 py-1.5">
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
                  <img
                    src={p.cover}
                    alt=""
                    width={28}
                    height={28}
                    draggable={false}
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
          <img
            src={preview.url}
            alt={preview.alt}
            width={256}
            height={256}
            referrerPolicy="no-referrer"
            draggable={false}
            className="h-56 w-56 select-none object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
            style={{ animation: "sticker-preview-in 180ms cubic-bezier(.34,1.56,.64,1)" }}
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
