import { createFileRoute } from "@tanstack/react-router";
import { ME } from "@/data/profile";

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

type Post = {
  id: string;
  author: { name: string; handle: string; badge: string };
  time: string;
  text: string;
  image?: string;
  likes: number;
  comments: number;
  pinned?: boolean;
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
    comments: 137,
  },
  {
    id: "2",
    author: { name: "Hell", handle: "@hell", badge: "OWNER" },
    time: "вчера",
    text: "Снимаем новый ролик про падения. RAW-камеры с трека уйдут только в клуб — за неделю до публики.",
    likes: 1204,
    comments: 89,
  },
  {
    id: "3",
    author: { name: "Pavel / команда", handle: "@team_pavel", badge: "TEAM" },
    time: "2 дн",
    text: "Перчатки HELLHOUND v2 поехали в производство. Первая партия — 300 пар, waitlist открываем в пятницу.",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
    likes: 567,
    comments: 64,
  },
  {
    id: "4",
    author: { name: "Hell", handle: "@hell", badge: "OWNER" },
    time: "3 дн",
    text: "Скинул в общий чат маршрут на субботу — Дмитров, 180 км по плохому асфальту. Кто едет — отметьтесь.",
    likes: 392,
    comments: 211,
  },
];

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

function PostCard({ post }: { post: Post }) {
  return (
    <article className="border border-white/[0.06] bg-card/40 backdrop-blur-sm transition-colors hover:border-white/[0.12]">
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
          <img src={post.image} alt="" loading="lazy" className="h-auto w-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-1 px-3 py-2">
        <PostAction icon={<HeartIcon />} count={post.likes} label="Лайк" />
        <PostAction icon={<CommentIcon />} count={post.comments} label="Комментарий" />
        <PostAction icon={<ShareIcon />} label="Поделиться" />
      </div>
    </article>
  );
}

function PostAction({
  icon,
  count,
  label,
}: {
  icon: React.ReactNode;
  count?: number;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="group flex items-center gap-2 px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="transition-transform group-active:scale-90">{icon}</span>
      {count !== undefined && <span>{formatCount(count)}</span>}
    </button>
  );
}

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return String(n);
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
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
