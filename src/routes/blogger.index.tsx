// Лента блогера: композер (текст + фото + опрос), список своих постов.
// Сами карточки — общий iOS-стиль из /club (PostCard), плюс moderate-режим:
// pin/unpin, удалить пост, удалить комментарии прямо в iOS-шторке.

import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Image as ImageIcon, Send, X, BarChart3, Plus } from "lucide-react";
import { feedStore, useFeedPosts, type FeedPoll } from "@/data/feed-store";
import { HellhoundAvatar } from "@/components/club/HellhoundPlaque";
import { useBloggerProfile } from "@/data/blogger-profile";
import { PostCard } from "@/routes/club.index";

const BLOGGER_SLUG = "hell";

export const Route = createFileRoute("/blogger/")({
  component: BloggerFeedPage,
});

function BloggerFeedPage() {
  const all = useFeedPosts();
  const mine = all.filter((p) => p.authorSlug === BLOGGER_SLUG);

  return (
    <main className="mx-auto w-full max-w-[640px] px-3 py-5 md:px-4 md:py-10">
      <div className="mb-5 flex items-center justify-between px-2">
        <h1 className="font-display text-lg font-black uppercase italic tracking-tight text-foreground">
          Лента
        </h1>
      </div>

      <Composer />

      <div className="mt-6 space-y-5">
        {mine.length === 0 && (
          <div className="grid h-40 place-items-center rounded-[24px] border border-dashed border-white/[0.08] bg-card/30 text-sm text-muted-foreground">
            Постов пока нет
          </div>
        )}
        {mine.map((p) => (
          <PostCard key={p.id} post={p} moderate />
        ))}
      </div>
    </main>
  );
}

// ───────── Composer ─────────

type PollDraft = {
  question: string;
  options: string[];
  anonymous: boolean;
  multi: boolean;
};

const emptyPoll = (): PollDraft => ({
  question: "",
  options: ["", ""],
  anonymous: true,
  multi: false,
});

function Composer() {
  const profile = useBloggerProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [poll, setPoll] = useState<PollDraft | null>(null);

  const pollValid =
    !!poll &&
    poll.question.trim().length > 0 &&
    poll.options.filter((o) => o.trim().length > 0).length >= 2;

  const canPost =
    (text.trim().length > 0 || !!image || !!poll) && (!poll || pollValid);

  const onFile = (file: File | null) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(file);
  };

  const publish = () => {
    if (!canPost) return;
    const pollPayload: FeedPoll | undefined = poll
      ? {
          question: poll.question.trim(),
          anonymous: poll.anonymous,
          multi: poll.multi,
          options: poll.options
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .map((t, i) => ({ id: `o${i + 1}`, text: t, votes: 0 })),
        }
      : undefined;
    feedStore.addPost({
      text: text.trim(),
      image,
      authorSlug: BLOGGER_SLUG,
      poll: pollPayload,
    });
    setText("");
    setImage(undefined);
    setPoll(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateOpt = (i: number, v: string) =>
    setPoll((p) => (p ? { ...p, options: p.options.map((o, j) => (j === i ? v : o)) } : p));
  const addOpt = () =>
    setPoll((p) => (p && p.options.length < 10 ? { ...p, options: [...p.options, ""] } : p));
  const removeOpt = (i: number) =>
    setPoll((p) => (p && p.options.length > 2 ? { ...p, options: p.options.filter((_, j) => j !== i) } : p));

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-card/60 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
      <div className="flex gap-3 p-4 md:p-5">
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
        <div className="px-3 pb-3">
          <div className="relative overflow-hidden rounded-[16px] border border-white/[0.05] bg-black">
            <img loading="lazy" decoding="async" src={image} alt="" className="max-h-[420px] w-full object-contain" />
            <button
              type="button"
              onClick={() => setImage(undefined)}
              aria-label="Удалить фото"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-foreground hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {poll && (
        <div className="mx-3 mb-3 rounded-[16px] border border-white/[0.06] bg-black/30 p-4 md:mx-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
              <BarChart3 className="h-3.5 w-3.5" /> Опрос
            </div>
            <button
              type="button"
              onClick={() => setPoll(null)}
              aria-label="Убрать опрос"
              className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.04] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            value={poll.question}
            onChange={(e) => setPoll((p) => (p ? { ...p, question: e.target.value } : p))}
            placeholder="Вопрос"
            maxLength={200}
            className="w-full rounded-[12px] border border-white/[0.08] bg-black/40 px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40"
          />

          <ul className="mt-3 space-y-2">
            {poll.options.map((o, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-white/20" />
                <input
                  value={o}
                  onChange={(e) => updateOpt(i, e.target.value)}
                  placeholder={`Вариант ${i + 1}`}
                  maxLength={100}
                  className="min-w-0 flex-1 rounded-[12px] border border-white/[0.06] bg-black/30 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40"
                />
                {poll.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOpt(i)}
                    aria-label="Убрать вариант"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {poll.options.length < 10 && (
            <button
              type="button"
              onClick={addOpt}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Добавить вариант
            </button>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground has-[:checked]:border-primary/40 has-[:checked]:text-primary">
              <input
                type="checkbox"
                checked={poll.anonymous}
                onChange={(e) => setPoll((p) => (p ? { ...p, anonymous: e.target.checked } : p))}
                className="h-3 w-3 accent-primary"
              />
              Анонимный
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground has-[:checked]:border-primary/40 has-[:checked]:text-primary">
              <input
                type="checkbox"
                checked={poll.multi}
                onChange={(e) => setPoll((p) => (p ? { ...p, multi: e.target.checked } : p))}
                className="h-3 w-3 accent-primary"
              />
              Несколько вариантов
            </label>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] bg-black/30 px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-primary"
          >
            <ImageIcon className="h-4 w-4" /> Фото
          </button>
          <button
            type="button"
            onClick={() => setPoll((p) => (p ? null : emptyPoll()))}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-white/[0.04] ${poll ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            <BarChart3 className="h-4 w-4" /> Опрос
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          type="button"
          onClick={publish}
          disabled={!canPost}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary-foreground transition-transform active:scale-95 disabled:opacity-30"
        >
          <Send className="h-3.5 w-3.5" /> Опубликовать
        </button>
      </div>
    </div>
  );
}
