// Комментарии под новостью: список, ответы, лайки, удаление своего/админом.

import { useMemo, useRef, useState } from "react";
import { AdaptiveSheet } from "@/components/club/AdaptiveSheet";
import { HellhoundAvatar } from "@/components/club/HellhoundPlaque";
import { PlumpComment, Send } from "@/components/ui/icons";
import { Heart, Trash2, X } from "lucide-react";
import { useViewer } from "@/hooks/use-viewer";
import { haptic } from "@/hooks/use-haptic";
import { hhToast } from "@/lib/hh-toast";
import {
  useAddNewsComment,
  useDeleteNewsComment,
  useNewsComments,
  useToggleNewsCommentLike,
  type NewsComment,
} from "@/lib/news-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postId: string;
  commentsCount?: number;
};

const NEWS_COLOR = "#B6FF3C";
const MAX = 2000;

function initialsOf(nick: string) {
  return (nick || "?").trim().slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч`;
  const d = Math.floor(h / 24);
  return `${d} дн`;
}

export function NewsCommentsSheet({ open, onOpenChange, postId, commentsCount = 0 }: Props) {
  const viewer = useViewer();
  const meId = viewer.user?.id ?? "";
  const isAdmin = viewer.user?.role === "admin";

  const listQ = useNewsComments(postId, open);
  const add = useAddNewsComment(postId);
  const del = useDeleteNewsComment(postId);
  const toggleLike = useToggleNewsCommentLike(postId);

  const [value, setValue] = useState("");
  const [replyTo, setReplyTo] = useState<NewsComment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = listQ.data ?? [];
  const total = items.length || commentsCount;

  // Плоский список превращаем в «корень + ответы под ним».
  const threads = useMemo(() => {
    const roots = items.filter((c) => !c.parentId);
    const byParent = new Map<string, NewsComment[]>();
    for (const c of items) {
      if (!c.parentId) continue;
      if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
      byParent.get(c.parentId)!.push(c);
    }
    return roots.map((r) => ({ root: r, replies: byParent.get(r.id) ?? [] }));
  }, [items]);

  const trimmed = value.trim();
  const disabled = trimmed.length === 0 || trimmed.length > MAX || add.isPending;

  const submit = async () => {
    if (disabled) return;
    if (!meId) {
      hhToast.error("Войди, чтобы комментировать");
      return;
    }
    haptic("light");
    try {
      await add.mutateAsync({ text: trimmed, parentId: replyTo?.id });
      setValue("");
      setReplyTo(null);
    } catch {
      hhToast.error("Не удалось отправить комментарий");
    }
  };

  const remove = async (c: NewsComment) => {
    haptic("light");
    try {
      await del.mutateAsync(c.id);
    } catch {
      hhToast.error("Не удалось удалить комментарий");
    }
  };

  const renderRow = (c: NewsComment, isReply = false) => {
    const canDelete = c.authorId === meId || isAdmin;
    return (
      <div key={c.id} className={`flex gap-2.5 ${isReply ? "ml-9" : ""}`}>
        <HellhoundAvatar
          size={isReply ? 28 : 34}
          initials={initialsOf(c.nick)}
          avatarUrl={c.avatarUrl ?? undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-[13px] font-black uppercase tracking-[0.08em] text-foreground">
              {c.nick}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {timeAgo(c.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-snug text-foreground/90">
            {c.text}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                haptic("light");
                toggleLike.mutate({ commentId: c.id, next: !c.liked });
              }}
              className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground transition-colors active:scale-95"
              style={c.liked ? { color: NEWS_COLOR } : undefined}
              aria-label="Нравится"
            >
              <Heart className="h-3.5 w-3.5" fill={c.liked ? NEWS_COLOR : "none"} />
              {c.likes > 0 ? c.likes : ""}
            </button>
            {!isReply && (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(c);
                  inputRef.current?.focus();
                }}
                className="font-mono text-[11px] uppercase text-muted-foreground transition-colors hover:text-foreground"
              >
                Ответить
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => void remove(c)}
                className="ml-auto text-muted-foreground transition-colors hover:text-rose-400"
                aria-label="Удалить"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdaptiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Комментарии · ${total}`}
      fullHeight
      doneAccent={NEWS_COLOR}
    >
      <div className="flex h-full min-h-[60vh] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {listQ.isLoading ? (
            <div className="py-10 text-center text-[13px] text-muted-foreground">Загружаем…</div>
          ) : threads.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <div
                className="grid h-14 w-14 place-items-center rounded-2xl"
                style={{ background: `${NEWS_COLOR}22`, color: NEWS_COLOR }}
              >
                <PlumpComment className="h-7 w-7" />
              </div>
              <div className="font-display text-[15px] font-black uppercase tracking-[0.14em] text-foreground">
                Пока нет комментариев
              </div>
              <p className="max-w-[280px] text-[13px] leading-snug text-muted-foreground">
                Будь первым — напиши, что думаешь об этой новости.
              </p>
            </div>
          ) : (
            threads.map(({ root, replies }) => (
              <div key={root.id} className="space-y-3">
                {renderRow(root)}
                {replies.map((r) => renderRow(r, true))}
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="sticky bottom-0 border-t border-white/[0.06] bg-background/95 px-3 py-3 backdrop-blur"
        >
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 text-[12px] text-muted-foreground">
              <span className="truncate">Ответ {replyTo.nick}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="ml-auto text-muted-foreground hover:text-foreground"
                aria-label="Отменить ответ"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={value}
              maxLength={MAX}
              onChange={(e) => setValue(e.target.value)}
              placeholder={meId ? "Написать комментарий…" : "Войди, чтобы комментировать"}
              disabled={!meId}
              className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[14px] text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={disabled || !meId}
              aria-label="Отправить"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.08] text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: NEWS_COLOR }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </AdaptiveSheet>
  );
}
