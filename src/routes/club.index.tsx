import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Smile, Paperclip, Send, Search as SearchIcon, Clock, Sticker } from "lucide-react";
import { RANKS, type RankId } from "@/data/ranks";
import { ME_SLUG, PUBLIC_USERS } from "@/data/users";
import { useFeedPosts, type FeedComment, type FeedPost } from "@/data/feed-store";
import { HellhoundAvatar, HellhoundChip, isHell } from "@/components/club/HellhoundPlaque";

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
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6 flex items-center justify-between border-b border-white/[0.06] pb-3">
        <h1 className="font-display text-lg font-black uppercase italic tracking-tight text-foreground">
          Лента
        </h1>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  );
}

// ───────── Post ─────────

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const likeCount = post.likes + (liked ? 1 : 0);
  const author = PUBLIC_USERS[post.authorSlug];

  return (
    <article className="border border-white/[0.06] bg-card/40 transition-colors hover:border-white/[0.10]">
      {post.pinned && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-primary/[0.04] px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 4l4 4-6 2 2 6-4 4-2-6-6 2 4-4-2-6 6 2 4-4z" />
          </svg>
          Закреплено
        </div>
      )}

      <header className="flex items-center gap-3 px-5 pt-5">
        <UserLink slug={post.authorSlug}>
          {isHell(post.authorSlug) ? (
            <HellhoundAvatar size={48} initials={author?.initials ?? "H"} avatarUrl={author?.avatarUrl} />
          ) : (
            <RankAvatar initials={author?.initials ?? "?"} rankId={author?.rank ?? "rookie"} size={48} />
          )}
        </UserLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <UserLink slug={post.authorSlug} className="truncate">
              <span className="truncate font-display text-[17px] font-black uppercase italic tracking-tight text-foreground transition-colors hover:text-primary">
                {author?.nick ?? post.authorSlug}
              </span>
            </UserLink>
            {isHell(post.authorSlug) ? <HellhoundChip size="sm" /> : <RoleBadge role={author?.role ?? "rider"} />}
          </div>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {post.time}
          </span>
        </div>
      </header>

      <p className="px-5 pb-4 pt-4 text-[15.5px] leading-[1.55] text-foreground/90">{post.text}</p>

      {post.image && (
        <div className="border-y border-white/[0.06] bg-black">
          <img
            src={post.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-stretch border-b border-white/[0.04]">
        <PostAction
          icon={<HeartIcon filled={liked} size={18} />}
          count={likeCount}
          label="Лайк"
          active={liked}
          onClick={() => setLiked((v) => !v)}
        />
        <span aria-hidden className="my-2 w-px bg-white/[0.05]" />
        <PostAction icon={<CommentIcon />} count={post.comments.length} label="Комментарий" />
        <span aria-hidden className="my-2 w-px bg-white/[0.05]" />
        <PostAction icon={<ShareIcon />} label="Поделиться" />
      </div>

      <CommentsBlock postId={post.id} comments={post.comments} />
    </article>
  );
}

function PostAction({
  icon,
  count,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  count?: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`group flex flex-1 items-center justify-center gap-2 px-3 py-3 font-mono text-[12px] font-bold uppercase tracking-wider tabular-nums transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:bg-white/[0.02] hover:text-foreground"
      }`}
    >
      <span className="transition-transform group-active:scale-90">{icon}</span>
      {count !== undefined ? <span>{formatCount(count)}</span> : <span>{label}</span>}
    </button>
  );
}

function RoleBadge({ role }: { role: "owner" | "team" | "rider" }) {
  if (role === "rider") return null;
  const label = role === "owner" ? "OWNER" : "TEAM";
  return (
    <span className="shrink-0 border border-primary/40 bg-primary/10 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
      {label}
    </span>
  );
}

// ───────── Comments ─────────

const INITIAL_VISIBLE = 2;

function CommentsBlock({ postId, comments }: { postId: string; comments: Comment[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? comments : comments.slice(0, INITIAL_VISIBLE);
  const hidden = Math.max(0, comments.length - INITIAL_VISIBLE);

  return (
    <div className="bg-black/30">
      <ul className="divide-y divide-white/[0.04]">
        {visible.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </ul>

      {hidden > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-2 border-t border-white/[0.04] px-5 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          <span className="h-px flex-1 bg-white/[0.06]" />
          показать ещё {hidden}
          <span className="h-px flex-1 bg-white/[0.06]" />
        </button>
      )}

      <CommentComposer postId={postId} />
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const [liked, setLiked] = useState(false);
  const user = PUBLIC_USERS[comment.authorSlug];
  const rank = RANK_BY_ID[user?.rank ?? "rookie"];
  const count = comment.likes + (liked ? 1 : 0);

  return (
    <li className="flex gap-3 px-5 py-3.5">
      <UserLink slug={comment.authorSlug}>
        {isHell(comment.authorSlug) ? (
          <HellhoundAvatar size={36} initials={user?.initials ?? "H"} avatarUrl={user?.avatarUrl} />
        ) : (
          <RankAvatar initials={user?.initials ?? "?"} rankId={user?.rank ?? "rookie"} size={36} />
        )}
      </UserLink>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <UserLink slug={comment.authorSlug} className="min-w-0 truncate">
            <span className="truncate font-display text-[13px] font-bold uppercase italic tracking-tight text-foreground transition-colors hover:text-primary">
              {user?.nick ?? comment.authorSlug}
            </span>
          </UserLink>
          {isHell(comment.authorSlug) ? (
            <HellhoundChip size="xs" />
          ) : (
            <span
              className="shrink-0 border px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider"
              style={{ color: rank.accent, borderColor: rank.accentSoft }}
            >
              {rank.short}
            </span>
          )}
          {!isHell(comment.authorSlug) && user?.role === "owner" && <RoleBadge role="owner" />}
          {!isHell(comment.authorSlug) && user?.role === "team" && <RoleBadge role="team" />}
          <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {comment.time}
          </span>
        </div>
        <p className="mt-1 break-words text-[13.5px] leading-relaxed text-foreground/85">
          {comment.text}
        </p>
        <button
          type="button"
          onClick={() => setLiked((v) => !v)}
          aria-pressed={liked}
          className={`mt-1.5 flex items-center gap-1.5 font-mono text-[11px] tabular-nums transition-colors ${
            liked ? "text-primary" : "text-muted-foreground hover:text-primary"
          }`}
        >
          <HeartIcon filled={liked} size={13} />
          <span>{count}</span>
        </button>
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

function CommentComposer({ postId }: { postId: string }) {
  const [value, setValue] = useState("");
  const [panel, setPanel] = useState<null | "emoji" | "stickers">(null);
  const [tab, setTab] = useState<"recent" | "emoji" | "stickers">("stickers");
  const me = PUBLIC_USERS[ME_SLUG];
  const disabled = value.trim().length === 0;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!panel) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [panel]);

  return (
    <div ref={wrapRef} className="relative border-t border-white/[0.06] bg-black/40">
      {panel && (
        <StickerPanel
          tab={tab}
          setTab={(t) => {
            setTab(t);
            setPanel(t === "stickers" ? "stickers" : "emoji");
          }}
          onClose={() => setPanel(null)}
        />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled) return;
          setValue("");
          setPanel(null);
          void postId;
        }}
        className="flex items-end gap-2 px-3 py-2.5"
      >
        <RankAvatar initials={me.initials} rankId={me.rank} size={32} />

        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-3xl border border-white/[0.08] bg-black/60 pl-2 pr-1 py-1 focus-within:border-primary/40">
          <button
            type="button"
            onClick={() => {
              setPanel(panel ? null : "emoji");
              setTab("emoji");
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
            placeholder="Написать комментарий…"
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
              setPanel(panel === "stickers" ? null : "stickers");
              setTab("stickers");
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
  onClose,
}: {
  tab: "recent" | "emoji" | "stickers";
  setTab: (t: "recent" | "emoji" | "stickers") => void;
  onClose: () => void;
}) {
  void onClose;
  return (
    <div className="border-b border-white/[0.06] bg-[#0d0d0d]">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5">
          <SearchIcon size={14} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск стикеров"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
        </div>
      </div>

      {/* Grid placeholder */}
      <div className="h-[220px] overflow-y-auto px-3 pb-2">
        {tab === "stickers" ? (
          <div className="grid grid-cols-5 gap-1.5 py-1">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="grid aspect-square place-items-center rounded-lg bg-white/[0.03] text-muted-foreground/40"
              >
                <Sticker size={22} strokeWidth={1.2} />
              </div>
            ))}
            <div className="col-span-5 pt-3 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
              стикеры скоро
            </div>
          </div>
        ) : tab === "emoji" ? (
          <div className="grid grid-cols-8 gap-1 py-1 text-2xl">
            {"😀 😁 😂 🤣 😊 😍 😎 🤘 🔥 💀 🏁 🏍️ ⚙️ 🛠️ 🏆 ⚡ 💯 👀 👍 🙏 🤝 🫡 😤 🥶".split(" ").map((e, i) => (
              <button
                key={i}
                type="button"
                className="grid aspect-square place-items-center rounded-lg hover:bg-white/[0.05]"
              >
                {e}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid h-full place-items-center text-[12px] text-muted-foreground/60">
            Здесь будут недавние
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-t border-white/[0.06] px-2 py-1.5">
        <PanelTab active={tab === "recent"} onClick={() => setTab("recent")} icon={<Clock size={16} />} />
        <PanelTab active={tab === "emoji"} onClick={() => setTab("emoji")} icon={<Smile size={16} />} />
        <PanelTab active={tab === "stickers"} onClick={() => setTab("stickers")} icon={<Sticker size={16} />} />
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
      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
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
