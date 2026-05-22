import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Smile, Paperclip, Send, Search as SearchIcon, Clock, Sticker, X, Pin, PinOff, Trash2 } from "lucide-react";
import { RANKS, type RankId } from "@/data/ranks";
import { ME_SLUG, PUBLIC_USERS } from "@/data/users";
import { useFeedPosts, feedStore, type FeedComment, type FeedPost, type FeedPoll } from "@/data/feed-store";
import { HellhoundAvatar, HellhoundChip, isHell } from "@/components/club/HellhoundPlaque";
import { IOSSheet } from "@/components/ios/IOSSheet";



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
  return (
    <main className="mx-auto w-full max-w-[640px] px-3 py-5 md:px-4 md:py-10">
      <div className="mb-5 flex items-center justify-between px-2">
        <h1 className="font-display text-lg font-black uppercase italic tracking-tight text-foreground">
          Лента
        </h1>
      </div>

      <div className="space-y-5">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  );
}

// ───────── Post ─────────

export function PostCard({ post, moderate = false }: { post: Post; moderate?: boolean }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const liked = post.liked;
  const likeCount = post.likes;
  const author = PUBLIC_USERS[post.authorSlug];


  return (
    <article className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-card/60 shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition-colors hover:border-white/[0.10]">
      {post.pinned && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-primary/[0.04] px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 4l4 4-6 2 2 6-4 4-2-6-6 2 4-4-2-6 6 2 4-4z" />
          </svg>
          Закреплено
        </div>
      )}

      <header className="flex items-center gap-3 px-4 pt-4 md:px-5 md:pt-5">
        <UserLink slug={post.authorSlug}>
          {isHell(post.authorSlug) ? (
            <HellhoundAvatar size={44} initials={author?.initials ?? "H"} avatarUrl={author?.avatarUrl} />
          ) : (
            <RankAvatar initials={author?.initials ?? "?"} rankId={author?.rank ?? "rookie"} size={44} />
          )}
        </UserLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <UserLink slug={post.authorSlug} className="truncate">
              <span className="truncate font-display text-[15px] font-black uppercase italic tracking-tight text-foreground transition-colors hover:text-primary">
                {author?.nick ?? post.authorSlug}
              </span>
            </UserLink>
            {isHell(post.authorSlug) ? <HellhoundChip size="sm" /> : <RoleBadge role={author?.role ?? "rider"} />}
          </div>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {post.time}
          </span>
        </div>
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
          <div className="overflow-hidden rounded-[16px] border border-white/[0.05] bg-black">
            <img
              src={post.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-white/[0.05] bg-black/30 px-3 py-2 md:px-4">
        <PostAction
          icon={<HeartIcon filled={liked} size={18} />}
          count={likeCount}
          label="Лайк"
          active={liked}
          onClick={() => {
            feedStore.toggleLike(post.id, !liked);
          }}
        />

        <PostAction
          icon={<CommentIcon />}
          count={post.comments.length}
          label="Комментарий"
          onClick={() => setCommentsOpen(true)}
        />
        <div className="ml-auto">
          <PostAction icon={<ShareIcon />} label="Поделиться" compact />
        </div>
      </div>

      <CommentsPreview
        comments={post.comments}
        onOpen={() => setCommentsOpen(true)}
      />

      <CommentsSheet
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        post={post}
        moderate={moderate}
      />
    </article>
  );
}

// ───────── Poll ─────────

function PollBlock({ poll, postId }: { poll: FeedPoll; postId: string }) {
  const serverVote = poll.myVote && poll.myVote.length > 0 ? poll.myVote[0] : null;
  const [voted, setVoted] = useState<string | null>(serverVote);

  // votes из server уже включают мой голос; локальный bonus только если выбрал, а сервер ещё не знал.
  const localBonus = voted && voted !== serverVote ? 1 : 0;
  const removedFromServer = serverVote && voted !== serverVote ? 1 : 0;
  const totals = poll.options.reduce((s, o) => s + o.votes, 0) + localBonus - removedFromServer;

  const onVote = (id: string) => {
    if (poll.closed) return;
    setVoted(id);
    feedStore.votePoll(postId, [id]);
  };

  const onRetract = () => {
    setVoted(null);
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
          const addBonus = voted === opt.id && voted !== serverVote ? 1 : 0;
          const subFromServer = serverVote === opt.id && voted !== serverVote ? 1 : 0;
          const votes = opt.votes + addBonus - subFromServer;
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

function RoleBadge({ role }: { role: "owner" | "team" | "rider" }) {
  if (role === "rider") return null;
  const label = role === "owner" ? "OWNER" : "TEAM";
  return (
    <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
      {label}
    </span>
  );
}

// ───────── Comments preview (под постом) ─────────

function CommentsPreview({
  comments,
  onOpen,
}: {
  comments: Comment[];
  onOpen: () => void;
}) {
  if (comments.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 border-t border-white/[0.05] bg-[oklch(0.10_0_0)]/60 px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary md:px-5"
      >
        Написать комментарий
      </button>
    );
  }
  const last = comments[comments.length - 1];
  const user = PUBLIC_USERS[last.authorSlug];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 border-t border-white/[0.05] bg-[oklch(0.10_0_0)]/60 px-4 py-3 text-left transition-colors active:bg-white/[0.02] md:px-5"
    >
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
        Все комментарии · {comments.length}
        <span className="text-muted-foreground">→</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="truncate font-display text-[12px] font-bold uppercase italic tracking-tight text-foreground/80">
          {user?.nick ?? last.authorSlug}
        </span>
        <span className="line-clamp-1 flex-1 text-[13px] text-foreground/70">{last.text}</span>
      </div>
    </button>
  );
}

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
  const listRef = useRef<HTMLDivElement>(null);

  // сбросить reply при закрытии
  useEffect(() => {
    if (!open) setReplyTo(null);
  }, [open]);

  // автоскролл вниз при добавлении
  const lastCount = useRef(post.comments.length);
  useEffect(() => {
    if (post.comments.length > lastCount.current && listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
    lastCount.current = post.comments.length;
  }, [post.comments.length]);

  return (
    <IOSSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Комментарии · ${post.comments.length}`}
      fullHeight
      contentClassName="!p-0"
    >
      <div className="flex h-full flex-col">
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5">
          {post.comments.length === 0 ? (
            <div className="grid h-full place-items-center text-[13px] text-muted-foreground">
              Будь первым — оставь комментарий
            </div>
          ) : (
            <ul className="space-y-5">
              {post.comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  large
                  onReply={() =>
                    setReplyTo({
                      nick: PUBLIC_USERS[c.authorSlug]?.nick ?? c.authorSlug,
                      commentId: c.id,
                    })
                  }
                  onDelete={
                    moderate
                      ? () => {
                          if (confirm("Удалить комментарий?")) feedStore.removeComment(post.id, c.id);
                        }
                      : undefined
                  }
                />
              ))}
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

function CommentItem({
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
  const user = PUBLIC_USERS[comment.authorSlug];
  const rank = RANK_BY_ID[user?.rank ?? "rookie"];
  const count = comment.likes;

  return (
    <li className="flex gap-3">
      <UserLink slug={comment.authorSlug}>
        {isHell(comment.authorSlug) ? (
          <HellhoundAvatar size={large ? 40 : 36} initials={user?.initials ?? "H"} avatarUrl={user?.avatarUrl} />
        ) : (
          <RankAvatar initials={user?.initials ?? "?"} rankId={user?.rank ?? "rookie"} size={large ? 40 : 36} />
        )}
      </UserLink>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <UserLink slug={comment.authorSlug} className="min-w-0 truncate">
            <span
              className={`truncate font-display font-bold uppercase italic tracking-tight transition-opacity hover:opacity-80 ${large ? "text-[14px]" : "text-[13px]"}`}
              style={{ color: isHell(comment.authorSlug) ? undefined : rank.accent }}
            >
              {user?.nick ?? comment.authorSlug}
            </span>
          </UserLink>
          {isHell(comment.authorSlug) ? (
            <HellhoundChip size="xs" />
          ) : (
            <span
              className="shrink-0 rounded-md border px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider"
              style={{ color: rank.accent, borderColor: rank.accentSoft, background: `${rank.accent}10` }}
            >
              {rank.short}
            </span>
          )}
          {!isHell(comment.authorSlug) && user?.role === "owner" && <RoleBadge role="owner" />}
          {!isHell(comment.authorSlug) && user?.role === "team" && <RoleBadge role="team" />}
          <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {comment.time}
          </span>
        </div>
        <div className="mt-1 inline-block max-w-full rounded-2xl rounded-tl-sm border border-white/[0.05] bg-white/[0.03] px-3 py-2">
          <p className={`break-words leading-relaxed text-foreground/90 ${large ? "text-[14.5px]" : "text-[13.5px]"}`}>
            {comment.text}
          </p>
        </div>
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
}



function UserLink({
  slug,
  children,
  className = "",
}: {
  slug: string;
  children: React.ReactNode;
  className?: string;
}) {
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
  size = 36,
}: {
  initials: string;
  rankId: RankId;
  size?: number;
}) {
  const rank = RANK_BY_ID[rankId];
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{
        height: size,
        width: size,
        boxShadow: `0 0 0 1px ${rank.accentSoft}`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ border: `1px solid ${rank.accent}`, opacity: 0.85 }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(135deg, ${rank.accent} 0%, transparent 70%)`,
        }}
      />
      <span
        className="relative font-display font-black uppercase italic"
        style={{ color: rank.accent, fontSize: Math.round(size * 0.32) }}
      >
        {initials}
      </span>
    </div>
  );
}

// Mock packs — позже заменим на данные из БД

type StickerPack = {
  id: string;
  title: string;
  cover: string; // emoji-cover пока, заменим на PNG
  stickers: string[]; // emoji-заглушки, потом URL картинок
};

const STICKER_PACKS: StickerPack[] = [
  {
    id: "hellhound-og",
    title: "HELLHOUND OG",
    cover: "🔥",
    stickers: ["🔥", "💀", "🤘", "🏁", "🏍️", "⚡", "💯", "👀", "😤", "🥶", "🛠️", "⚙️", "🏆", "🤝", "🫡", "😎"],
  },
  {
    id: "race-pass-s1",
    title: "Race Pass · S1",
    cover: "🏁",
    stickers: ["🏁", "🏍️", "🏆", "⚡", "🔥", "💨", "🛞", "🧰", "📈", "🥇", "🥈", "🥉"],
  },
  {
    id: "moto-mood",
    title: "Moto Mood",
    cover: "🤘",
    stickers: ["😀", "😁", "😂", "🤣", "😊", "😍", "😎", "🤘", "🙏", "👍", "👌", "🤙"],
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
  const me = PUBLIC_USERS[ME_SLUG];
  const disabled = value.trim().length === 0;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      feedStore.addComment(postId, { authorSlug: ME_SLUG, text: `${prefix}${clean}` });
      setValue("");
      setPanel(null);
      onClearReply?.();
    },
    [postId, replyTo, onClearReply],
  );

  const insertEmoji = useCallback((e: string) => {
    setValue((v) => v + e);
    inputRef.current?.focus();
  }, []);

  const sendSticker = useCallback(
    (s: string) => {
      pushRecent(s);
      const prefix = replyTo ? `@${replyTo.nick} ` : "";
      feedStore.addComment(postId, { authorSlug: ME_SLUG, text: `${prefix}${s}` });
      setPanel(null);
      onClearReply?.();
    },
    [postId, replyTo, onClearReply, pushRecent],
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
        <RankAvatar initials={me.initials} rankId={me.rank} size={32} />

        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-3xl border border-white/[0.08] bg-black/60 pl-2 pr-1 py-1 focus-within:border-primary/40">
          <button
            type="button"
            onClick={() => {
              if (panel === "emoji") {
                setPanel(null);
              } else {
                setPanel("emoji");
                setTab("emoji");
              }
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Эмодзи и стикеры"
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

          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Прикрепить"
          >
            <Paperclip size={18} strokeWidth={1.6} />
          </button>
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
  onPickEmoji,
  onPickSticker,
}: {
  tab: "recent" | "emoji" | "stickers";
  setTab: (t: "recent" | "emoji" | "stickers") => void;
  activePack: string;
  setActivePack: (id: string) => void;
  large?: boolean;
  recent: string[];
  onPickEmoji: (e: string) => void;
  onPickSticker: (s: string) => void;
}) {
  const pack = STICKER_PACKS.find((p) => p.id === activePack) ?? STICKER_PACKS[0];

  return (
    <div className={`flex flex-col bg-[#0d0d0d] ${large ? "h-[min(70vh,560px)]" : "h-[min(55vh,420px)]"}`}>
      {/* Search */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5">
          <SearchIcon size={14} className="text-muted-foreground" />
          <input
            type="text"
            placeholder={tab === "emoji" ? "Поиск эмодзи" : "Поиск стикеров"}
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
            <div className={`grid gap-1 ${large ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-5"}`}>
              {pack.stickers.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPickSticker(s)}
                  className={`grid aspect-square place-items-center rounded-lg transition-transform active:scale-90 hover:bg-white/[0.04] ${large ? "text-6xl sm:text-7xl" : "text-4xl sm:text-[40px]"}`}
                >
                  <span>{s}</span>
                </button>
              ))}
              <div className="col-span-full pt-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
                стикеры-заглушки · скоро PNG
              </div>
            </div>
          </>
        ) : tab === "emoji" ? (
          <div className={`grid gap-1 pt-1 ${large ? "grid-cols-6 sm:grid-cols-7" : "grid-cols-7 sm:grid-cols-8"}`}>
            {"😀 😁 😂 🤣 😊 😍 😎 🤘 🔥 💀 🏁 🏍️ ⚙️ 🛠️ 🏆 ⚡ 💯 👀 👍 🙏 🤝 🫡 😤 🥶 😅 😉 🥰 😘 🤔 🙄 😴 🤯".split(" ").map((e, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onPickEmoji(e)}
                className={`grid aspect-square place-items-center rounded-lg transition-transform active:scale-90 hover:bg-white/[0.05] ${large ? "text-4xl" : "text-[26px]"}`}
              >
                {e}
              </button>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center text-[12px] text-muted-foreground/60">
            Здесь появятся стикеры и эмодзи, которые ты используешь
          </div>
        ) : (
          <div className={`grid gap-1 pt-1 ${large ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-5 sm:grid-cols-6"}`}>
            {recent.map((s, i) => (
              <button
                key={`${s}-${i}`}
                type="button"
                onClick={() => onPickSticker(s)}
                className={`grid aspect-square place-items-center rounded-lg transition-transform active:scale-90 hover:bg-white/[0.04] ${large ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"}`}
              >
                <span>{s}</span>
              </button>
            ))}
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
        <PanelTab
          active={tab === "emoji"}
          onClick={() => setTab("emoji")}
          icon={<Smile size={18} />}
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
                {p.cover}
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
