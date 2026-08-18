// Единый Telegram-style шит комментариев.
// Используется и лентой Hellhound, и новостями — данные приходят через `store`.

import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { Send, PlumpSticker as Sticker, PlumpClose as X, PlumpImage as ImageIcon, PlumpCamera as Camera, PlumpAttach } from "@/components/ui/icons";
import { RANKS, type RankId } from "@/data/ranks";
import { feedStore, initialsOf, makeSlug, type FeedAuthor, type FeedComment, type FeedPost } from "@/data/feed-store";
import { HellhoundAvatar } from "@/components/club/HellhoundPlaque";
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
import { REACTIONS, type Reaction } from "@/components/club/LikeButton";
import { ImageViewer } from "@/components/club/ImageViewer";
import { CommentReactionsBar } from "@/components/club/CommentReactionsBar";
import { commentReactionsStore } from "@/data/comment-reactions-store";
import { hhToast } from "@/lib/hh-toast";
import { haptic } from "@/hooks/use-haptic";
import { RelativeTime } from "@/components/club/RelativeTime";

type Comment = FeedComment;
type Post = FeedPost;

const RANK_BY_ID = Object.fromEntries(RANKS.map((r) => [r.id, r])) as Record<
  RankId,
  (typeof RANKS)[number]
>;

/** Абстракция над источником комментариев (лента / новости). */
export type CommentsStore = {
  addComment(
    postId: string,
    input: {
      author: FeedAuthor;
      text?: string;
      imageUrl?: string;
      stickerId?: string;
      parentId?: string;
    },
  ): Promise<unknown> | unknown;
  editComment(postId: string, commentId: string, text: string): Promise<unknown> | unknown;
  removeComment(postId: string, commentId: string): Promise<unknown> | unknown;
  toggleCommentLike(commentId: string, next: boolean): void;
  loadFull?(postId: string): void;
};

/** Дефолтный стор — лента Hellhound. */
export const feedCommentsStore: CommentsStore = {
  addComment: (postId, input) => feedStore.addComment(postId, input),
  editComment: (postId, commentId, text) => feedStore.editComment(postId, commentId, text),
  removeComment: (postId, commentId) => feedStore.removeComment(postId, commentId),
  toggleCommentLike: (commentId, next) => feedStore.toggleCommentLike(commentId, next),
  loadFull: (postId) => feedStore.loadFullComments(postId),
};

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

// ───────── Comments sheet (Telegram-style full-screen) ─────────

export function CommentsSheet({
  open,
  onOpenChange,
  post,
  moderate = false,
  store = feedCommentsStore,
  accent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  post: Post;
  moderate?: boolean;
  /** Источник данных: лента (по умолчанию) или новости. */
  store?: CommentsStore;
  /** Акцентный цвет заголовка/подсветок (по умолчанию — цвет бренда). */
  accent?: string;
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
  // Максимальный createdAt, который юзер РЕАЛЬНО увидел в этой сессии
  // (через IntersectionObserver на li). При закрытии шита запишем
  // max(prev, maxSeenAtRef) — так непрочитанные из прошлой сессии,
  // до которых юзер НЕ доскроллил, останутся непрочитанными.
  const maxSeenAtRef = useRef<number>(0);
  // ID последнего отправленного мной комментария — для fly-in анимации.
  const [justSentId, setJustSentId] = useState<string | null>(null);
  // Скелетоны не должны висеть вечно, если bff наврал в commentsCount.
  const [skeletonExpired, setSkeletonExpired] = useState(false);
  // Floating «↓ N»: видим ли мы низ списка + сколько новых пришло пока юзер был вверху.
  const [atBottom, setAtBottom] = useState(true);
  const [newSinceLeft, setNewSinceLeft] = useState(0);
  // snapshot length когда юзер ушёл от низа — против него считаем дельту
  const leftBottomCountRef = useRef<number>(0);


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
      // На закрытии запоминаем «прочитано до самого нового РЕАЛЬНО увиденного».
      // Если юзер ничего не успел увидеть (мгновенно закрыл) — НЕ двигаем метку.
      try {
        const prev = Number(localStorage.getItem(lastReadStorageKey) || 0);
        const next = Math.max(prev, maxSeenAtRef.current);
        if (next > prev) localStorage.setItem(lastReadStorageKey, String(next));
      } catch {}
      maxSeenAtRef.current = 0;
      return;
    }
    try {
      const raw = localStorage.getItem(lastReadStorageKey);
      const parsed = raw ? Number(raw) || 0 : 0;
      setLastReadAt(parsed);
      maxSeenAtRef.current = parsed; // стартуем с того, что уже было прочитано
    } catch { setLastReadAt(0); }
    setSkeletonExpired(false);
    if (!post.commentsFull) {
      store.loadFull?.(post.id);
      // Защита от вечных скелетонов: через 4с показываем то, что есть.
      const t = setTimeout(() => setSkeletonExpired(true), 4000);
      return () => clearTimeout(t);
    }
  }, [open, post.id, post.commentsFull, lastReadStorageKey]);

  // Deep-link на коммент: ?c=<commentId>. Скроллим + подсвечиваем пульсом.
  // После — ВЫЧИЩАЕМ параметр из URL, чтобы при «поделиться» не утаскивать
  // подсветку чужого комментария.
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
      if (!el) return; // нет в DOM (свёрнутый тред / ещё не прорендерили) — повторим на следующем обновлении
      scrolledToTargetRef.current = target; // помечаем ТОЛЬКО после реального скролла
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(target);
      setTimeout(() => setHighlightId(null), 1800);
      // Чистим ?c из URL, сохраняя остальные параметры.
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("c");
        window.history.replaceState({}, "", url.toString());
      } catch {}
    });
  }, [open, post.comments]);

  // Авто-скролл к низу + fly-in, когда юзер отправил свой коммент.
  // ВАЖНО: скроллим только если (а) коммент top-level (ответы в треде не двигают
  // основной список) И (б) юзер уже был близко к низу — иначе уносим его
  // от того места, что он читает.
  useEffect(() => {
    if (!open) return;
    const prev = prevCountRef.current;
    const next = post.comments.length;
    if (next > prev && myId != null) {
      // Ищем САМЫЙ свежий мой коммент среди прилетевших, а не просто последний:
      // SSE может прислать чужой коммент позже моего, и тогда мой не последний.
      let mine: Comment | null = null;
      let mineTs = 0;
      for (let i = next - 1; i >= prev; i--) {
        const c = post.comments[i];
        if (!c || c.author.id !== myId) continue;
        const t = c.createdAt ? new Date(c.createdAt).getTime() : 0;
        if (t >= mineTs) { mine = c; mineTs = t; }
      }
      if (mine) {
        const myComment = mine;
        setJustSentId(myComment.id);
        setTimeout(() => setJustSentId((id) => (id === myComment.id ? null : id)), 600);
        const isTopLevel = !myComment.parentId;
        const el = listRef.current;
        const nearBottom = el
          ? el.scrollHeight - el.scrollTop - el.clientHeight < 240
          : false;
        if (isTopLevel && el && nearBottom) {
          requestAnimationFrame(() => {
            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
          });
        }
      }
    }
    prevCountRef.current = next;
  }, [open, post.comments, myId]);

  // IntersectionObserver: трекаем максимальный createdAt РЕАЛЬНО увиденного
  // комментария. Нужно, чтобы «Новые» не пропадали для непрочитанной части,
  // до которой юзер не доскроллил.
  useEffect(() => {
    if (!open) return;
    const root = listRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.commentId;
          if (!id) continue;
          const c = post.comments.find((x) => x.id === id);
          if (!c?.createdAt) continue;
          const t = new Date(c.createdAt).getTime();
          if (t > maxSeenAtRef.current) maxSeenAtRef.current = t;
        }
      },
      { root, threshold: 0.6 },
    );
    const nodes = root.querySelectorAll<HTMLElement>("[data-comment-id]");
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [open, post.comments]);

  // Scroll-трекинг низа: показываем «↓ N» когда юзер ушёл от низа.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const compute = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
      setAtBottom((prev) => {
        if (prev && !near) {
          // Только что ушли от низа — снапшот текущей длины списка.
          leftBottomCountRef.current = post.comments.length;
        }
        if (!prev && near) {
          // Вернулись к низу — сбрасываем счётчик.
          setNewSinceLeft(0);
        }
        return near;
      });
    };
    compute();
    el.addEventListener("scroll", compute, { passive: true });
    return () => el.removeEventListener("scroll", compute);
  }, [open, post.comments.length]);

  // Прирост непрочитанных пока юзер вверху.
  useEffect(() => {
    if (!open) return;
    if (atBottom) return;
    const delta = post.comments.length - leftBottomCountRef.current;
    if (delta > 0) setNewSinceLeft(delta);
  }, [open, atBottom, post.comments.length]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setNewSinceLeft(0);
  }, []);



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
    await store.editComment(post.id, commentId, trimmed);
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
    const item = (
      <CommentItem
        key={c.id}
        comment={isReply ? { ...c, text: stripReplyPrefix(c.text) } : c}
        knownNicks={knownNicks}
        large
        isMine={isMine}
        editing={editingId === c.id}
        onSaveEdit={(text) => handleSaveEdit(c.id, text)}
        onCancelEdit={() => setEditingId(null)}
        onReply={() => handleReply(c)}
        onLongPress={() => setActionTarget(c)}
        onMore={() => setActionTarget(c)}
        onDoubleTap={() => commentReactionsStore.toggle(c.id, "🔥")}
        onToggleLike={(next) => store.toggleCommentLike(c.id, next)}
      />
    );
    return item;
  };

  return (
    <AdaptiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Комментарии · ${post.commentsCount}`}
      fullHeight
      contentClassName="!p-0 !overflow-hidden flex flex-col min-h-0 max-w-full"
    >
      <div className="flex h-full min-h-0 max-w-full flex-1 flex-col overflow-hidden">
        <div
          ref={listRef}
          className="min-h-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 md:px-5"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            overscrollBehaviorX: "none",
          } as React.CSSProperties}
        >
          {post.commentsCount === 0 ? (
            <div className="grid h-full place-items-center text-[13px] text-muted-foreground">
              Будь первым — оставь комментарий
            </div>
          ) : !post.commentsFull && post.commentsCount > post.comments.length && !skeletonExpired ? (
            <CommentSkeletonList count={Math.min(5, post.commentsCount)} />
          ) : (
            <ul className="max-w-full space-y-5">
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
                        className="sticky top-0 z-10 !my-3 -mx-4 md:-mx-5 flex items-center gap-2 px-4 md:px-5 py-1.5 bg-[#0d0d0d]/92 backdrop-blur-md"
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
                      className={`max-w-full space-y-3 overflow-hidden rounded-2xl transition-colors ${isHi ? "ring-2 ring-primary/60 bg-primary/[0.04]" : ""}`}
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
                        <div className="min-w-0 max-w-full overflow-hidden pl-12">
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
                            <ul className="max-w-full space-y-4">
                              {children.map((child) => {
                                const isChildHi = highlightId === child.id;
                                const isChildJustSent = justSentId === child.id;
                                return (
                                  <div
                                    key={child.id}
                                    data-comment-id={child.id}
                                     className={`max-w-full overflow-hidden rounded-2xl transition-colors ${isChildHi ? "ring-2 ring-primary/60 bg-primary/[0.04]" : ""}`}
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
              0%   { background-color: rgba(240,0,192,0.18); }
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

          {/* Floating «↓ N» — внизу скролл-контейнера, sticky.
              Прячем когда атBottom; счётчик показываем только если что-то прилетело. */}
          <div className="pointer-events-none sticky bottom-2 z-20 flex justify-end">
            <button
              type="button"
              aria-label={newSinceLeft > 0 ? `${newSinceLeft} новых · вниз` : "Вниз"}
              onClick={() => { haptic("selection"); scrollToBottom(); }}
              className={`pointer-events-auto relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#1a1a1a]/95 text-foreground shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-200 active:scale-90 ${
                atBottom ? "pointer-events-none translate-y-3 scale-90 opacity-0" : "opacity-100"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              {newSinceLeft > 0 && (
                <span className="absolute -top-1 -right-1 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold leading-none text-primary-foreground tabular-nums">
                  {newSinceLeft > 99 ? "99+" : newSinceLeft}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="shrink-0 border-t border-white/[0.06] bg-[#0d0d0d]">
          <CommentComposer
            postId={post.id}
            knownNicks={knownNicks}
            large
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
            store={store}
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
          if (pendingDelete) void store.removeComment(post.id, pendingDelete);
          setPendingDelete(null);
        }}
      />

      {/* Главный action-sheet — открывается по long-press / кнопке «…» */}
      <AdaptiveActionSheet
        open={actionTarget !== null}
        onOpenChange={(v: boolean) => !v && setActionTarget(null)}
        items={actionTarget ? buildActionItems(actionTarget) : []}
      />

      {/* Выбор реакции — горизонтальный ряд из 5 эмодзи */}
      <AdaptiveActionSheet
        open={reactionFor !== null}
        onOpenChange={(v: boolean) => !v && setReactionFor(null)}
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
    </AdaptiveSheet>
  );
}

// Всплывающее «🔥» по двойному тапу (Telegram-style heart, наш огонь).
function DoubleTapSplash() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center text-[44px] leading-none"
      style={{ animation: "hh-splash 700ms cubic-bezier(.34,1.56,.64,1) forwards" }}
    >
      🔥
      <style>{`
        @keyframes hh-splash {
          0%   { opacity: 0; transform: scale(0.4); }
          30%  { opacity: 1; transform: scale(1.25); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.1) translateY(-12px); }
        }
      `}</style>
    </span>
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
  isMine = false,
  onReply,
  onSaveEdit,
  onCancelEdit,
  onLongPress,
  onMore,
  onDoubleTap,
  onToggleLike,
}: {
  comment: Comment;
  /** Если задан — только эти @nick рендерятся как кликабельные ссылки. */
  knownNicks?: Set<string>;
  large?: boolean;
  editing?: boolean;
  /** Моё сообщение — рендерим салатовым (видит только автор). */
  isMine?: boolean;
  onReply?: () => void;
  onSaveEdit?: (text: string) => void;
  onCancelEdit?: () => void;
  /** Долгий тап — открыть action-sheet. */
  onLongPress?: () => void;
  /** Клик по «…» — тот же action-sheet. */
  onMore?: () => void;
  /** Двойной тап по тексту/стикеру — быстрая реакция 🔥. */
  onDoubleTap?: () => void;
  /** Лайк коммента. */
  onToggleLike?: (next: boolean) => void;
}) {
  const liked = comment.liked;
  const author = comment.author;
  const rank = RANK_BY_ID[(author.rankId as RankId) ?? "rookie"] ?? RANK_BY_ID["rookie"];
  const count = comment.likes;
  const authorIsBlogger = author.isBlogger;
  const stickerUrl = getCommentStickerUrl(comment);
  const imageUrl = comment.imageUrl ?? (comment.kind === "image" ? null : null);
  const stickerRef = useRef<StickerViewHandle | null>(null);
  const navigate = useNavigate();
  const myPacksQ = useMyStickerPacks();
  const stickerPack = stickerUrl ? findPackByStickerUrl(stickerUrl) : undefined;
  const stickerLocked = !!(
    stickerPack?.lockSlug &&
    stickerPack?.productSlug &&
    !(myPacksQ.data ?? []).includes(stickerPack.lockSlug)
  );
  const [imgViewerOpen, setImgViewerOpen] = useState(false);

  // Локальный текст для inline-edit
  const [draft, setDraft] = useState(comment.text);
  useEffect(() => {
    if (editing) setDraft(comment.text);
  }, [editing, comment.text]);

  // 🔥-сплеш по двойному тапу
  const [splash, setSplash] = useState(false);
  const splashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSplash = useCallback(() => {
    setSplash(true);
    if (splashTimer.current) clearTimeout(splashTimer.current);
    splashTimer.current = setTimeout(() => setSplash(false), 700);
  }, []);
  useEffect(() => () => { if (splashTimer.current) clearTimeout(splashTimer.current); }, []);

  // Long-press + double-tap detection. Один обработчик для touch и click.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const lastTapRef = useRef(0);
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
  const handleTap = useCallback(() => {
    if (longPressedRef.current) return;
    if (!onDoubleTap) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      haptic("success");
      triggerSplash();
      onDoubleTap();
    } else {
      lastTapRef.current = now;
    }
  }, [onDoubleTap, triggerSplash]);
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!onLongPress) return;
      e.preventDefault();
      onLongPress();
    },
    [onLongPress],
  );

  return (
    <li className="flex max-w-full min-w-0 gap-3 overflow-hidden">
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
      <div className="min-w-0 max-w-full flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2">
          <UserLink slug={author.slug} disabled={authorIsBlogger} className="min-w-0 truncate">
            <span
              className={`truncate font-display font-bold uppercase  tracking-tight transition-opacity hover:opacity-80 ${large ? "text-[14px]" : "text-[13px]"}`}
              style={{ color: authorIsBlogger ? undefined : rank.accent }}
            >
              {author.nick}
            </span>
          </UserLink>
          {!authorIsBlogger && (
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

        {editing && !stickerUrl && !imageUrl ? (
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
        ) : imageUrl ? (
          <div className="relative mt-1 select-none">
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setImgViewerOpen(true);
              }}
              onContextMenu={handleContextMenu}
              className="block max-w-[260px] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] active:opacity-90 md:max-w-[300px]"
              aria-label="Открыть фото"
            >
              <img
                src={imageUrl}
                alt={comment.text || "фото"}
                loading="lazy"
                decoding="async"
                className="h-auto max-h-[360px] w-full object-cover"
              />
            </button>
            {comment.text?.trim() && (
              <p className={`mt-1.5 break-words leading-relaxed text-foreground/90 ${large ? "text-[14.5px]" : "text-[13.5px]"}`}>
                {renderCommentText(comment.text, knownNicks)}
              </p>
            )}
            {imgViewerOpen && (
              <ImageViewer
                src={imageUrl}
                open={imgViewerOpen}
                onClose={() => setImgViewerOpen(false)}
              />
            )}
          </div>
        ) : stickerUrl ? (
          <div
            className="relative mt-1 cursor-pointer select-none"
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchMove={handlePressEnd}
            onTouchCancel={handlePressEnd}
            onClick={() => {
              if (stickerLocked && stickerPack?.productSlug) {
                haptic("light");
                navigate({ to: "/club/shop/$productSlug", params: { productSlug: stickerPack.productSlug } });
                return;
              }
              haptic("light");
              handleTap();
            }}
            onContextMenu={handleContextMenu}
          >
            <StickerView
              ref={stickerRef}
              url={stickerUrl}
              alt="стикер"
              size={208}
              loop
              className="h-48 w-48 select-none object-contain md:h-52 md:w-52"
            />
            {splash && <DoubleTapSplash />}
          </div>
        ) : (
          <div
            className="relative mt-1 inline-block max-w-full select-text rounded-2xl rounded-tl-sm px-3 py-2"
            style={{ backgroundColor: isMine ? "#B6FF3C" : "#ffffff" }}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchMove={handlePressEnd}
            onTouchCancel={handlePressEnd}
            onClick={handleTap}
            onContextMenu={handleContextMenu}
          >
            <p className={`break-words font-display font-bold leading-snug tracking-tight text-black ${large ? "text-[14.5px]" : "text-[13.5px]"}`}>
              {renderCommentText(comment.text, knownNicks)}
            </p>
            {splash && <DoubleTapSplash />}
          </div>
        )}

        <CommentReactionsBar commentId={comment.id} />

        <div className="mt-1.5 flex min-w-0 items-center gap-4 overflow-hidden pl-1">
          <button
            type="button"
            onClick={() => {
              onToggleLike?.(!liked);
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
              onClick={(e) => {
                e.stopPropagation();
                onMore();
              }}
              onPointerDown={(e) => e.stopPropagation()}
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



export function UserLink({
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

export function RankAvatar({
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
          className="relative font-display font-black uppercase"
          style={{ color: rank.accent, fontSize: Math.round(size * 0.32) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

// Mock packs — позже заменим на данные из БД

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
  store = feedCommentsStore,
}: {
  postId: string;
  store?: CommentsStore;
  /** Список ников, которых можно меншенить (для автокомплита) — обычно участники треда. */
  knownNicks?: Set<string>;
  large?: boolean;
  replyTo?: { nick: string; commentId: string } | null;
  onClearReply?: () => void;
}) {
  const [value, setValue] = useState("");
  const [panel, setPanel] = useState<null | "emoji" | "stickers">(null);
  const [tab, setTab] = useState<StickerTab>("stickers");
  const [activePack, setActivePack] = useState<string>(STICKER_PACKS[0].id);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [submitting, setSubmitting] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ url: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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
  const hasImage = !!pendingImage;
  const disabled = (!hasImage && trimmed.length === 0) || overLimit || submitting || uploading;
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
      const img = pendingImage;
      if (!img && (!clean || clean.length > COMMENT_MAX)) return;
      if (clean.length > COMMENT_MAX) return;
      const now = Date.now();
      if (now - lastSentAt.current < COMMENT_MIN_INTERVAL_MS) return;
      lastSentAt.current = now;
      setSubmitting(true);
      try {
        await store.addComment(postId, {
          author: meAuthor,
          text: clean || undefined,
          imageUrl: img?.url,
          parentId: replyTo?.commentId,
        });
        setValue("");
        setPanel(null);
        if (img) {
          try { URL.revokeObjectURL(img.preview); } catch { /* noop */ }
        }
        setPendingImage(null);
        onClearReply?.();
      } finally {
        setSubmitting(false);
      }
    },
    [postId, replyTo, onClearReply, meAuthor, pendingImage],
  );

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      hhToast.error("Только картинки");
      return;
    }
    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) {
      hhToast.error("Файл больше 10 МБ");
      return;
    }
    setAttachOpen(false);
    const preview = URL.createObjectURL(file);
    setPendingImage({ url: "", preview });
    setUploading(true);
    try {
      const { uploadFileToS3 } = await import("@/lib/garage-api");
      const url = await uploadFileToS3(file, "post", postId);
      setPendingImage({ url, preview });
    } catch {
      hhToast.error("Не удалось загрузить фото");
      try { URL.revokeObjectURL(preview); } catch { /* noop */ }
      setPendingImage(null);
    } finally {
      setUploading(false);
    }
  }, [postId]);

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
      await store.addComment(postId, {
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
      {pendingImage && (
        <div className="flex items-center gap-2 border-b border-white/[0.05] bg-white/[0.02] px-3 py-2">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/40">
            <img src={pendingImage.preview} alt="" className="h-full w-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 grid place-items-center bg-black/50">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-[12px] text-muted-foreground">
            {uploading ? "Загружаю фото…" : "Фото готово. Добавь подпись (опционально) и отправь."}
          </div>
          <button
            type="button"
            onClick={() => {
              const img = pendingImage;
              try { URL.revokeObjectURL(img.preview); } catch { /* noop */ }
              setPendingImage(null);
            }}
            aria-label="Убрать фото"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitText(value);
        }}
        className="flex items-end gap-2 px-3 py-2.5"
      >
        {/* Left: attach (paperclip) — заглушка под фото/камеру/файл */}
        <button
          type="button"
          onClick={() => {
            haptic("light");
            setPanel(null);
            setAttachOpen(true);
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:scale-95"
          aria-label="Прикрепить"
        >
          <PlumpAttach className="h-5 w-5" />
        </button>

        {/* Center: input pill with inline emoji button on the right */}
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl border border-white/[0.08] bg-black/60 pl-3 pr-1 py-1 focus-within:border-primary/40">
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
          {/* Эмодзи-кнопку добавим в Этапе 2 вместе с реальной вкладкой эмодзи в пикере. */}
        </div>

        {/* Right: morphs between Sticker (when empty) and Send (when typing) */}
        {trimmed.length === 0 && !hasImage ? (
          <button
            type="button"
            onClick={() => {
              haptic("light");
              if (panel === "stickers" && tab === "stickers") {
                setPanel(null);
              } else {
                setPanel("stickers");
                setTab("stickers");
              }
            }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            aria-label="Стикеры"
          >
            <Sticker size={22} />
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

      {/* Attach sheet — фото из галереи или камера */}
      <AdaptiveActionSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        title="Прикрепить к комментарию"
        description="JPG, PNG или WebP, до 10 МБ"
        items={[
          {
            key: "photo",
            label: "Фото из галереи",
            icon: <ImageIcon size={20} strokeWidth={1.7} />,
            onSelect: () => {
              setAttachOpen(false);
              fileInputRef.current?.click();
            },
          },
          {
            key: "camera",
            label: "Сделать фото",
            icon: <Camera size={20} strokeWidth={1.7} />,
            onSelect: () => {
              setAttachOpen(false);
              cameraInputRef.current?.click();
            },
          },
        ]}
      />
    </div>
  );
}




