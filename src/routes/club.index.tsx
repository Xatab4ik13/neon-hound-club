import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ME } from "@/data/profile";
import { RANKS, type RankId } from "@/data/ranks";

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

// ───────── Типы и моки ─────────

type Author = { name: string; handle: string; badge: "OWNER" | "TEAM" };

type Commenter = {
  nick: string;
  initials: string;
  rank: RankId;
};

type Comment = {
  id: string;
  author: Commenter;
  time: string;
  text: string;
  likes: number;
};

type Post = {
  id: string;
  author: Author;
  time: string;
  text: string;
  image?: string;
  likes: number;
  pinned?: boolean;
  comments: Comment[];
};

const POSTS: Post[] = [
  {
    id: "1",
    author: { name: "Hell", handle: "@hell", badge: "OWNER" },
    time: "2 ч",
    pinned: true,
    text: "Розыгрыш Yamaha R1 закрывается в воскресенье. Осталось 412 билетов из 3000. Кто ещё думает — подумайте быстрее.",
    image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80",
    likes: 842,
    comments: [
      {
        id: "c1",
        author: { nick: "asphalt_dog", initials: "AS", rank: "alpha-hound" },
        time: "22 мин",
        text: "Уже закинул на три билета. В этот раз повезёт больше, чем с Кавасаки.",
        likes: 18,
      },
      {
        id: "c2",
        author: { nick: "tankslapper", initials: "TS", rank: "road-captain" },
        time: "1 ч",
        text: "По стате R1 идёт активнее, чем R6 в прошлом сезоне. Логично — модель свежее.",
        likes: 9,
      },
      {
        id: "c3",
        author: { nick: "vasya_pit", initials: "VP", rank: "pit-crew" },
        time: "1 ч",
        text: "А по доставке выигравшему — забирать самому или привезут?",
        likes: 4,
      },
      {
        id: "c4",
        author: { nick: "hell_legend_01", initials: "HL", rank: "hell-legend" },
        time: "2 ч",
        text: "Hell, спасибо за честный розыгрыш. Уже третий год подряд участвую.",
        likes: 27,
      },
    ],
  },
  {
    id: "2",
    author: { name: "Hell", handle: "@hell", badge: "OWNER" },
    time: "вчера",
    text: "Снимаем новый ролик про падения. RAW-камеры с трека уйдут только в клуб — за неделю до публики.",
    likes: 1204,
    comments: [
      {
        id: "c5",
        author: { nick: "vip_rider", initials: "VR", rank: "vip" },
        time: "10 ч",
        text: "Это причина оставаться в клубе. Спасибо.",
        likes: 33,
      },
      {
        id: "c6",
        author: { nick: "rookie_max", initials: "RM", rank: "rookie" },
        time: "8 ч",
        text: "А будет момент с тем выездом на гравий?",
        likes: 2,
      },
    ],
  },
  {
    id: "3",
    author: { name: "Pavel / команда", handle: "@team_pavel", badge: "TEAM" },
    time: "2 дн",
    text: "Перчатки HELLHOUND v2 поехали в производство. Первая партия — 300 пар, waitlist открываем в пятницу.",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
    likes: 567,
    comments: [
      {
        id: "c7",
        author: { nick: "moto_anya", initials: "MA", rank: "road-captain" },
        time: "1 д",
        text: "Размерная сетка та же, что у v1, или поменялась? У меня M был впритык.",
        likes: 11,
      },
      {
        id: "c8",
        author: { nick: "garage_77", initials: "G7", rank: "pit-crew" },
        time: "20 ч",
        text: "Защита костяшек обновилась? На v1 за сезон стёрлась.",
        likes: 6,
      },
      {
        id: "c9",
        author: { nick: "wheelie_kid", initials: "WK", rank: "alpha-hound" },
        time: "5 ч",
        text: "Платина, забирайте перед общим стартом. Иначе разберут.",
        likes: 14,
      },
    ],
  },
  {
    id: "4",
    author: { name: "Hell", handle: "@hell", badge: "OWNER" },
    time: "3 дн",
    text: "Скинул в общий чат маршрут на субботу — Дмитров, 180 км по плохому асфальту. Кто едет — отметьтесь.",
    likes: 392,
    comments: [
      {
        id: "c10",
        author: { nick: "kuzya_msk", initials: "KZ", rank: "rookie" },
        time: "2 д",
        text: "Я в деле. На R6, средний темп норм?",
        likes: 3,
      },
      {
        id: "c11",
        author: { nick: "captain_volk", initials: "CV", rank: "road-captain" },
        time: "2 д",
        text: "Если асфальт реально плохой — лучше не на спорте. Возьму твин.",
        likes: 8,
      },
    ],
  },
];

const RANK_BY_ID = Object.fromEntries(RANKS.map((r) => [r.id, r])) as Record<
  RankId,
  (typeof RANKS)[number]
>;

// ───────── Page ─────────

function ClubFeedPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Composer />
      <div className="space-y-4">
        {POSTS.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  );
}

function Composer() {
  return (
    <div className="mb-6 border border-white/[0.06] bg-card/40 p-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center bg-primary/15 font-display text-xs font-bold uppercase italic text-primary">
          {ME.nick.slice(0, 2)}
        </div>
        <button
          type="button"
          className="flex-1 cursor-not-allowed border border-dashed border-white/[0.08] px-4 py-2 text-left text-muted-foreground/70"
          title="Только Hell и команда могут публиковать"
        >
          Только Hell и команда публикуют посты
        </button>
      </div>
    </div>
  );
}

// ───────── Post ─────────

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const likeCount = post.likes + (liked ? 1 : 0);

  return (
    <article className="border border-white/[0.06] bg-card/40 transition-colors hover:border-white/[0.12]">
      {post.pinned && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 4l4 4-6 2 2 6-4 4-2-6-6 2 4-4-2-6 6 2 4-4z" />
          </svg>
          Закреплено
        </div>
      )}

      <div className="flex items-center gap-3 px-5 pt-4">
        <div className="flex h-10 w-10 items-center justify-center bg-primary/15 font-display text-sm font-bold uppercase italic text-primary">
          {post.author.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-base font-bold uppercase italic tracking-tight text-foreground">
              {post.author.name}
            </span>
            <span className="border border-primary/40 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
              {post.author.badge}
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {post.author.handle} · {post.time}
          </span>
        </div>
      </div>

      <p className="px-5 pb-4 pt-3 text-[15px] leading-relaxed text-foreground/90">
        {post.text}
      </p>

      {post.image && (
        <div className="border-y border-white/[0.06] bg-black">
          <img
            src={post.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-white/[0.04] px-3 py-2">
        <PostAction
          icon={<HeartIcon filled={liked} />}
          count={likeCount}
          label="Лайк"
          active={liked}
          onClick={() => setLiked((v) => !v)}
        />
        <PostAction icon={<CommentIcon />} count={post.comments.length} label="Комментарий" />
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
      className={`group flex items-center gap-2 px-3 py-2 font-mono text-xs tabular-nums transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-primary"
      }`}
    >
      <span className="transition-transform group-active:scale-90">{icon}</span>
      {count !== undefined && <span>{formatCount(count)}</span>}
    </button>
  );
}

// ───────── Comments ─────────

const INITIAL_VISIBLE = 2;

function CommentsBlock({ postId, comments }: { postId: string; comments: Comment[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? comments : comments.slice(0, INITIAL_VISIBLE);
  const hidden = Math.max(0, comments.length - INITIAL_VISIBLE);

  return (
    <div className="bg-[#0a0a0a]/60">
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
  const rank = RANK_BY_ID[comment.author.rank];
  const count = comment.likes + (liked ? 1 : 0);

  return (
    <li className="flex gap-3 px-5 py-3">
      <RankAvatar initials={comment.author.initials} rankId={comment.author.rank} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-[13px] font-bold uppercase italic tracking-tight text-foreground">
            {comment.author.nick}
          </span>
          <span
            className="shrink-0 border px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider"
            style={{
              color: rank.accent,
              borderColor: rank.accentSoft,
            }}
          >
            {rank.short}
          </span>
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

function RankAvatar({ initials, rankId }: { initials: string; rankId: RankId }) {
  const rank = RANK_BY_ID[rankId];
  // Двойная рамка цветом ранга — без backdrop-blur и без анимаций.
  return (
    <div
      className="relative flex h-9 w-9 shrink-0 items-center justify-center"
      style={{
        boxShadow: `0 0 0 1px ${rank.accentSoft}, inset 0 0 0 1px rgba(0,0,0,0.6)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ border: `1px solid ${rank.accent}`, opacity: 0.85 }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-15"
        style={{
          background: `linear-gradient(135deg, ${rank.accent} 0%, transparent 70%)`,
        }}
      />
      <span
        className="relative font-display text-[11px] font-black uppercase italic"
        style={{ color: rank.accent }}
      >
        {initials}
      </span>
    </div>
  );
}

function CommentComposer({ postId }: { postId: string }) {
  const [value, setValue] = useState("");
  const initials = useMemo(() => ME.nick.slice(0, 2).toUpperCase(), []);
  // postId — задел под будущий submit на бэк; пока локально.
  const disabled = value.trim().length === 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        setValue("");
        // Заглушка: позже сюда придёт мутация по postId.
        void postId;
      }}
      className="flex items-center gap-2 border-t border-white/[0.06] bg-black/30 px-3 py-2.5"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary/15 font-display text-[10px] font-bold uppercase italic text-primary">
        {initials}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Написать комментарий…"
        className="min-w-0 flex-1 border border-white/[0.06] bg-black/40 px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50"
      />
      <button
        type="submit"
        disabled={disabled}
        className="px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-primary transition-opacity disabled:opacity-30"
      >
        отпр.
      </button>
    </form>
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
