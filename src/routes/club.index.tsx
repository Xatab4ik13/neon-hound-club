import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { flushSync } from "react-dom";
import { Smile, Send, Search as SearchIcon, Clock, Sticker, X, Pin, PinOff, Trash2, BarChart3, Share2, MessageCircle, Heart } from "lucide-react";
import { RANKS, type RankId } from "@/data/ranks";
import { useFeedPosts, useFeedLoaded, feedStore, initialsOf, makeSlug, type FeedAuthor, type FeedComment, type FeedPost, type FeedPoll } from "@/data/feed-store";
import { HellhoundAvatar, HellhoundChip } from "@/components/club/HellhoundPlaque";
import { IOSSheet } from "@/components/ios/IOSSheet";
import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile } from "@/lib/garage-api";
import { useMyStickerPacks, STICKER_PACK_PRODUCT_SLUGS } from "@/lib/stickers-api";
import { SPECIAL_PACK_STICKERS, SPECIAL_PACK_COVER } from "@/assets/stickers/special";
import { FeedHeroCarousel } from "@/components/club/FeedHeroCarousel";
import { LikeButton } from "@/components/club/LikeButton";
import { ImageViewer } from "@/components/club/ImageViewer";
import { PostSkeleton } from "@/components/club/PostSkeleton";
import { ReactionsBar } from "@/components/club/ReactionsBar";
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
              draggable={false}
              className="aspect-[16/9] w-full select-none object-cover"
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
          onClose={() => setViewerOpen(false)}
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
  const viewer = useViewer();
  const myId = viewer.user?.id ?? null;


  // сбросить reply при закрытии; при открытии — подгрузить ПОЛНЫЙ список коментов
  useEffect(() => {
    if (!open) {
      setReplyTo(null);
      return;
    }
    if (!post.commentsFull) {
      feedStore.loadFullComments(post.id);
    }
  }, [open, post.id, post.commentsFull]);



  // Группировка ответов: ответ = коммент, начинающийся с "@<nick> "
  const { topLevel, childrenByParentId } = useMemo<{
    topLevel: Comment[];
    childrenByParentId: Map<string, Comment[]>;
  }>(() => {
    const childrenByParentId = new Map<string, Comment[]>();
    const topLevel: Comment[] = [];
    const nickToLatest = new Map<string, string>(); // nick(lower) -> commentId
    for (const c of post.comments) {
      const m = c.text.match(/^@(\S+)\s/);
      const parentId = m ? nickToLatest.get(m[1].toLowerCase()) : undefined;
      if (parentId) {
        const arr = childrenByParentId.get(parentId) ?? [];
        arr.push(c);
        childrenByParentId.set(parentId, arr);
      } else {
        topLevel.push(c);
      }
      nickToLatest.set(c.author.nick.toLowerCase(), c.id);
    }
    return { topLevel, childrenByParentId };
  }, [post.comments]);



  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stripReplyPrefix = (text: string) => text.replace(/^@\S+\s+/, "");

  const renderItem = (c: Comment, isReply = false) => {
    const isMine = myId != null && c.author.id === myId;
    const canDelete = isMine || moderate;
    const onDelete = canDelete
      ? () => {
          if (confirm("Удалить комментарий?")) feedStore.removeComment(post.id, c.id);
        }
      : undefined;

    const item = (
      <CommentItem
        key={c.id}
        comment={isReply ? { ...c, text: stripReplyPrefix(c.text) } : c}
        large
        onReply={() =>
          setReplyTo({
            nick: c.author.nick,
            commentId: c.id,
          })
        }
        onDelete={moderate ? onDelete : undefined}
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
          onAction: () => {
            if (confirm("Удалить комментарий?")) feedStore.removeComment(post.id, c.id);
          },
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
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {post.commentsCount === 0 ? (
            <div className="grid h-full place-items-center text-[13px] text-muted-foreground">
              Будь первым — оставь комментарий
            </div>
          ) : (
            <ul className="space-y-5">
              {topLevel.map((c) => {
                const children = childrenByParentId.get(c.id) ?? [];
                const isCollapsed = collapsed.has(c.id);
                return (
                  <li key={c.id} data-comment-id={c.id} className="space-y-3">
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
                            {children.map((child) => renderItem(child, true))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="shrink-0 border-t border-white/[0.06] bg-[#0d0d0d]">
          <CommentComposer
            postId={post.id}
            large
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
          />
        </div>
      </div>

    </IOSSheet>
  );
}

// ───────── Comment item ─────────

const CommentItem = memo(function CommentItem({
  comment,
  large = false,
  onReply,
  onDelete,
}: {
  comment: Comment;
  large?: boolean;
  onReply?: () => void;
  onDelete?: () => void;
}) {
  const liked = comment.liked;
  const author = comment.author;
  const rank = RANK_BY_ID[(author.rankId as RankId) ?? "rookie"] ?? RANK_BY_ID["rookie"];
  const count = comment.likes;
  const authorIsBlogger = author.isBlogger;
  const stickerUrl = parseSticker(comment.text);

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
          </span>
        </div>
        {stickerUrl ? (
          <div className="mt-1">
            <img
              src={stickerUrl}
              alt="стикер"
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-48 w-48 select-none object-contain md:h-52 md:w-52"
            />
          </div>
        ) : (
          <div className="mt-1 inline-block max-w-full rounded-2xl rounded-tl-sm border border-white/[0.05] bg-white/[0.03] px-3 py-2">
            <p className={`break-words leading-relaxed text-foreground/90 ${large ? "text-[14.5px]" : "text-[13.5px]"}`}>
              {comment.text}
            </p>
          </div>
        )}
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
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Удалить комментарий"
              title="Удалить комментарий"
              className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Удалить
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

/** Префикс-маркер: текст комментария = стикер-картинка. */
const STICKER_PREFIX = "::sticker::";
const asStickerText = (url: string) => `${STICKER_PREFIX}${url}`;
const parseSticker = (text: string): string | null =>
  text.startsWith(STICKER_PREFIX) ? text.slice(STICKER_PREFIX.length) : null;

type StickerPack = {
  id: string;
  title: string;
  cover: string; // emoji-cover ИЛИ url картинки
  coverIsImage?: boolean;
  stickers: string[]; // emoji-строка ИЛИ "::sticker::<url>"
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

function CommentComposer({
  postId,
  large = false,
  replyTo,
  onClearReply,
}: {
  postId: string;
  large?: boolean;
  replyTo?: { nick: string; commentId: string } | null;
  onClearReply?: () => void;
}) {
  const [value, setValue] = useState("");
  const [panel, setPanel] = useState<null | "emoji" | "stickers">(null);
  const [tab, setTab] = useState<"recent" | "emoji" | "stickers">("stickers");
  const [activePack, setActivePack] = useState<string>(STICKER_PACKS[0].id);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
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
  const disabled = value.trim().length === 0;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const pushRecent = useCallback((s: string) => {
    setRecent((prev) => {
      const next = [s, ...prev.filter((x) => x !== s)].slice(0, 24);
      saveRecent(next);
      return next;
    });
  }, []);

  const submitText = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const prefix = replyTo ? `@${replyTo.nick} ` : "";
      feedStore.addComment(postId, { author: meAuthor, text: `${prefix}${clean}` });
      setValue("");
      setPanel(null);
      onClearReply?.();
    },
    [postId, replyTo, onClearReply, meAuthor],
  );

  const insertEmoji = useCallback((e: string) => {
    setValue((v) => v + e);
    inputRef.current?.focus();
  }, []);

  const sendSticker = useCallback(
    (s: string) => {
      pushRecent(s);
      const prefix = replyTo ? `@${replyTo.nick} ` : "";
      feedStore.addComment(postId, { author: meAuthor, text: `${prefix}${s}` });
      setPanel(null);
      onClearReply?.();
    },
    [postId, replyTo, onClearReply, pushRecent, meAuthor],
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
          submitText(value);
        }}
        className="flex items-end gap-2 px-3 py-2.5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-3xl border border-white/[0.08] bg-black/60 pl-2 pr-1 py-1 focus-within:border-primary/40">
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

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setPanel(null)}
            placeholder={replyTo ? `Ответить @${replyTo.nick}…` : "Написать комментарий…"}
            className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
        </div>

        {disabled ? (
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
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
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
  onPickEmoji,
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

  return (
    <div className={`flex flex-col bg-[#0d0d0d] ${large ? "h-[min(70vh,560px)]" : "h-[min(55vh,420px)]"}`}>
      {/* Search */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5">
          <SearchIcon size={14} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск стикеров"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {tab === "stickers" ? (
          <>
            <div className="sticky top-0 z-10 -mx-2 mb-1 bg-[#0d0d0d]/95 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              {pack.title}
            </div>
            <div className="relative">
              <div
                className={`grid gap-1 ${large ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-5"} ${isLocked ? "pointer-events-none select-none blur-[3px] opacity-60" : ""}`}
              >
                {pack.stickers.map((s, i) => {
                  const url = parseSticker(s);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isLocked}
                      onClick={() => onPickSticker(s)}
                      className={`grid aspect-square place-items-center rounded-lg transition-transform active:scale-90 hover:bg-white/[0.04] ${url ? "p-1.5" : large ? "text-6xl sm:text-7xl" : "text-4xl sm:text-[40px]"}`}
                    >
                      {url ? (
                        <img
                          src={url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
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
                  onClick={() => onPickSticker(s)}
                  className={`grid aspect-square place-items-center rounded-lg transition-transform active:scale-90 hover:bg-white/[0.04] ${url ? "p-1.5" : large ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"}`}
                >
                  {url ? (
                    <img src={url} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full select-none object-contain" />
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
                  <img src={p.cover} alt="" draggable={false} className="h-7 w-7 select-none object-contain" />
                ) : (
                  p.cover
                )}
              </button>
            );
          })}
        </div>
      </div>
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
