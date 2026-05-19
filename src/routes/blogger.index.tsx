// Лента блогера: композер (текст + фото), список своих постов, удаление поста,
// модерация комментариев. Посты публикуются в общий стор и появляются в /club.

import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Image as ImageIcon, Send, Trash2, X, Pin, PinOff } from "lucide-react";
import { feedStore, useFeedPosts, type FeedPost } from "@/data/feed-store";
import { PUBLIC_USERS } from "@/data/users";
import { HellhoundAvatar, HellhoundChip } from "@/components/club/HellhoundPlaque";
import { useBloggerProfile } from "@/data/blogger-profile";

const BLOGGER_SLUG = "hell";

export const Route = createFileRoute("/blogger/")({
  component: BloggerFeedPage,
});

function BloggerFeedPage() {
  const all = useFeedPosts();
  const mine = all.filter((p) => p.authorSlug === BLOGGER_SLUG);

  return (
    <main className="relative flex-1 px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-black italic uppercase tracking-tight md:text-4xl">
          Лента
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Публикации появляются в общей ленте клуба. Здесь — управление своими постами и модерация комментариев.
        </p>

        <Composer />

        <div className="mt-8 space-y-5">
          {mine.length === 0 && (
            <div className="flex h-40 items-center justify-center border border-dashed border-white/[0.08] bg-white/[0.02] text-sm text-muted-foreground">
              Постов пока нет
            </div>
          )}
          {mine.map((p) => (
            <ManagePostCard key={p.id} post={p} />
          ))}
        </div>
      </div>
    </main>
  );
}

// ───────── Composer ─────────

function Composer() {
  const profile = useBloggerProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();

  const canPost = text.trim().length > 0 || !!image;

  const onFile = (file: File | null) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(file);
  };

  const publish = () => {
    if (!canPost) return;
    feedStore.addPost({ text: text.trim(), image, authorSlug: BLOGGER_SLUG });
    setText("");
    setImage(undefined);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="mt-6 border border-white/[0.08] bg-card/40">
      <div className="flex gap-3 p-4">
        <HellhoundAvatar size={44} initials={profile.initials} avatarUrl={profile.avatarUrl} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Что у тебя нового?"
          rows={3}
          className="min-w-0 flex-1 resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none"
        />
      </div>

      {image && (
        <div className="relative border-y border-white/[0.06] bg-black">
          <img src={image} alt="" className="max-h-[420px] w-full object-contain" />
          <button
            type="button"
            onClick={() => setImage(undefined)}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center bg-black/70 text-foreground hover:bg-black"
            aria-label="Удалить фото"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          <ImageIcon className="h-4 w-4" /> Фото
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          onClick={publish}
          disabled={!canPost}
          className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:opacity-30"
        >
          <Send className="h-3.5 w-3.5" /> Опубликовать
        </button>
      </div>
    </div>
  );
}

// ───────── Post Card (manage view) ─────────

function ManagePostCard({ post }: { post: FeedPost }) {
  const profile = useBloggerProfile();

  return (
    <article className="border border-white/[0.08] bg-card/40">
      <header className="flex items-center gap-3 px-4 pt-4">
        <HellhoundAvatar size={42} initials={profile.initials} avatarUrl={profile.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-base font-black italic uppercase tracking-tight">
              {profile.nick}
            </span>
            <HellhoundChip size="xs" />
            {post.pinned && (
              <span className="inline-flex items-center gap-1 border border-primary/40 bg-primary/10 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                <Pin className="h-2.5 w-2.5" /> Закреп
              </span>
            )}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {post.time}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => feedStore.updatePost(post.id, { pinned: !post.pinned })}
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-muted-foreground hover:border-primary/40 hover:text-primary"
            aria-label={post.pinned ? "Открепить" : "Закрепить"}
            title={post.pinned ? "Открепить" : "Закрепить"}
          >
            {post.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Удалить пост?")) feedStore.removePost(post.id);
            }}
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-muted-foreground hover:border-destructive/60 hover:text-destructive"
            aria-label="Удалить пост"
            title="Удалить пост"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {post.text && (
        <p className="px-4 pb-3 pt-3 text-[15px] leading-[1.55] text-foreground/90">{post.text}</p>
      )}

      {post.image && (
        <div className="border-y border-white/[0.06] bg-black">
          <img src={post.image} alt="" className="max-h-[480px] w-full object-contain" />
        </div>
      )}

      <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>♥ {post.likes}</span>
        <span>{post.comments.length} комм.</span>
      </div>

      <ModerationBlock post={post} />
    </article>
  );
}

function ModerationBlock({ post }: { post: FeedPost }) {
  const [expanded, setExpanded] = useState(false);
  if (post.comments.length === 0) {
    return (
      <div className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
        Комментариев пока нет
      </div>
    );
  }
  const visible = expanded ? post.comments : post.comments.slice(0, 3);
  const hidden = Math.max(0, post.comments.length - 3);
  return (
    <div className="bg-black/30">
      <ul className="divide-y divide-white/[0.04]">
        {visible.map((c) => {
          const u = PUBLIC_USERS[c.authorSlug];
          return (
            <li key={c.id} className="flex items-start gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 bg-black/40 font-display text-[11px] font-black italic uppercase text-muted-foreground">
                {u?.initials ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display text-[12px] font-bold uppercase italic">
                    {u?.nick ?? c.authorSlug}
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {c.time}
                  </span>
                </div>
                <p className="mt-1 break-words text-[13px] text-foreground/85">{c.text}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Удалить комментарий?")) feedStore.removeComment(post.id, c.id);
                }}
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center border border-white/10 text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                aria-label="Удалить комментарий"
                title="Удалить комментарий"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full border-t border-white/[0.04] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary"
        >
          показать ещё {hidden}
        </button>
      )}
    </div>
  );
}
