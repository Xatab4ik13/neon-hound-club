// API-backed адаптер ленты. Снаружи интерфейс совпадает с прежним моком,
// внутри — реальные вызовы Fastify (см. server/src/routes/feed.ts).

import { useSyncExternalStore, useEffect } from "react";
import { BACKEND_URL } from "@/lib/api";
import {
  fetchFeed,
  fetchPost,
  createPost,
  patchPost,
  deletePost,
  addComment as addCommentApi,
  deleteComment as deleteCommentApi,
  likePost,
  unlikePost,
  votePoll,
  unvotePoll,
  likeComment,
  unlikeComment,
  type FeedPostHydrated,
  type FeedCommentHydrated,
} from "@/lib/queries";
import { hhToast } from "@/lib/hh-toast";
import { haptic } from "@/hooks/use-haptic";

// ───────── Внешние типы (контракт UI) ─────────

/**
 * Самодостаточный автор поста/коммента. Всё, что UI должен знать о юзере,
 * приходит прямо в payload бэка. Никаких внешних словарей.
 */
export type FeedAuthor = {
  id: string;
  /** URL-slug для /club/u/$nick. Для обычных юзеров — производный от ника. */
  slug: string;
  nick: string;
  initials: string;
  avatarUrl?: string;
  rankId: string;
  role: "user" | "admin" | "blogger";
  isBlogger: boolean;
};

export type FeedComment = {
  id: string;
  author: FeedAuthor;
  time: string;
  /** ISO-строка момента создания — используется для форматирования времени и сортировки. */
  createdAt: string;
  /** ISO-метка редактирования, undefined если не редактировался. */
  editedAt?: string;
  text: string;
  /** 'text' (по умолчанию) или 'sticker' — для рендеринга через <img>. */
  kind: "text" | "sticker";
  /** URL/id стикера когда kind === 'sticker'. */
  stickerId?: string;
  /** id родительского коммента (для тредов). */
  parentId?: string;
  likes: number;
  liked: boolean;
  // ↓ shim для старых мест UI; всегда == author.slug / author.isBlogger
  authorId: string;
  authorSlug: string;
  isBlogger: boolean;
};

export type FeedPollOption = { id: string; text: string; votes: number };

export type FeedPoll = {
  question: string;
  options: FeedPollOption[];
  anonymous?: boolean;
  multi?: boolean;
  closed?: boolean;
  myVote?: string[];
};

export type FeedPost = {
  id: string;
  author: FeedAuthor;
  time: string;
  /** ISO-строка момента создания — для живого относительного времени. */
  createdAt?: string;
  text: string;
  image?: string;
  poll?: FeedPoll;
  likes: number;
  liked: boolean;
  pinned?: boolean;
  // shim
  authorId: string;
  authorSlug: string;
  isBlogger: boolean;
  comments: FeedComment[];
  /** Реальное число коментов на бэке (может быть больше, чем length массива preview). */
  commentsCount: number;
  /** true когда `comments` содержит ПОЛНЫЙ список (после loadFullComments). */
  commentsFull?: boolean;
};

// ───────── Утилиты ─────────

export function makeSlug(nick: string): string {
  return nick
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

export function initialsOf(nick: string): string {
  const t = nick.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function buildAuthor(input: {
  id: string;
  nick: string;
  role: "user" | "admin" | "blogger" | string | null;
  avatarUrl: string | null;
  rankId: string | null;
}): FeedAuthor {
  const role = (input.role === "admin" || input.role === "blogger" ? input.role : "user") as
    | "user"
    | "admin"
    | "blogger";
  return {
    id: input.id,
    slug: makeSlug(input.nick) || input.id,
    nick: input.nick,
    initials: initialsOf(input.nick),
    avatarUrl: input.avatarUrl ?? undefined,
    rankId: input.rankId ?? "rookie",
    role,
    isBlogger: role === "blogger",
  };
}

// ───────── Относительное время ─────────

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  if (diff < 86400 * 2) return "вчера";
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн`;
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// ───────── Маппинг API → FeedPost ─────────

function mapComment(c: FeedCommentHydrated): FeedComment {
  const author = buildAuthor({
    id: c.authorId,
    nick: c.nick,
    role: c.role,
    avatarUrl: c.avatarUrl,
    rankId: c.rankId,
  });
  return {
    id: c.id,
    author,
    authorId: author.id,
    authorSlug: author.slug,
    isBlogger: author.isBlogger,
    time: formatRelative(c.createdAt),
    createdAt: c.createdAt,
    editedAt: c.editedAt ?? undefined,
    text: c.text,
    kind: c.kind ?? "text",
    stickerId: c.stickerId ?? undefined,
    parentId: c.parentId ?? undefined,
    likes: c.likes,
    liked: c.liked,
  };
}

export type FeedPostWithComments = FeedPostHydrated & { comments?: FeedCommentHydrated[] };

export function mapPost(p: FeedPostWithComments): FeedPost {
  const author = buildAuthor({
    id: p.author.id,
    nick: p.author.nick,
    role: p.author.role,
    avatarUrl: p.author.avatarUrl,
    rankId: p.author.rankId,
  });
  return {
    id: p.id,
    author,
    authorId: author.id,
    authorSlug: author.slug,
    isBlogger: author.isBlogger,
    time: formatRelative(p.createdAt),
    createdAt: p.createdAt,
    text: p.text,
    image: p.imageUrl ?? undefined,
    pinned: p.pinned,
    poll: p.poll
      ? {
          question: p.poll.question,
          anonymous: p.poll.anonymous,
          multi: p.poll.multi,
          closed: p.poll.closed,
          myVote: p.poll.myVote,
          options: p.poll.results.map((o) => ({ id: o.id, text: o.text, votes: o.votes })),
        }
      : undefined,
    likes: p.likes,
    liked: p.liked,
    comments: (p.comments ?? []).map(mapComment),
    commentsCount: p.commentsCount ?? (p.comments?.length ?? 0),
  };
}

function sortCommentsByCreatedAt(comments: FeedComment[]): FeedComment[] {
  return [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function mergeLoadedComments(prev: FeedComment[], next: FeedComment[]): FeedComment[] {
  const byId = new Map<string, FeedComment>();
  for (const comment of prev) byId.set(comment.id, comment);
  for (const comment of next) byId.set(comment.id, comment);
  return sortCommentsByCreatedAt([...byId.values()]);
}

function keepLoadedComments(prev: FeedPost | undefined, next: FeedPost): FeedPost {
  const nextLooksFull = next.commentsCount === next.comments.length;
  if (nextLooksFull) {
    return {
      ...next,
      comments: sortCommentsByCreatedAt(next.comments),
      commentsFull: true,
    };
  }

  if (!prev?.commentsFull) return next;

  return {
    ...next,
    comments: mergeLoadedComments(prev.comments, next.comments),
    commentsFull: true,
  };
}

// ───────── Reactive store ─────────

let POSTS: FeedPost[] = [];
let loaded = false;
let pending: Promise<void> | null = null;
let nextCursor: string | null = null;
let loadingMore = false;
const PAGE_SIZE = 30;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function patchPostLocal(id: string, fn: (p: FeedPost) => FeedPost) {
  POSTS = POSTS.map((p) => (p.id === id ? fn(p) : p));
  emit();
}

async function refetch(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    try {
      const r = await fetchFeed({ limit: PAGE_SIZE });
      const prevById = new Map(POSTS.map((post) => [post.id, post]));
      POSTS = r.items.map((item) => keepLoadedComments(prevById.get(item.id), mapPost(item)));
      nextCursor = r.nextCursor;
      loaded = true;
      emit();
    } catch {
      // оставляем предыдущее состояние; UI просто покажет последний снапшот
    } finally {
      pending = null;
    }
  })();
  return pending;
}

async function loadMore(): Promise<void> {
  if (loadingMore || !nextCursor) return;
  loadingMore = true;
  emit();
  try {
    const r = await fetchFeed({ limit: PAGE_SIZE, cursor: nextCursor });
    const existing = new Set(POSTS.map((p) => p.id));
    const fresh = r.items.map(mapPost).filter((p) => !existing.has(p.id));
    POSTS = [...POSTS, ...fresh];
    nextCursor = r.nextCursor;
  } catch {
    /* молча — кнопка/триггер останется активным, юзер скроллит ещё раз */
  } finally {
    loadingMore = false;
    emit();
  }
}

export const feedStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    if (!loaded && !pending) refetch();
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot() {
    return POSTS;
  },
  refresh: refetch,
  loadMore,

  async addPost(input: { text: string; image?: string; poll?: FeedPoll }) {
    await createPost({
      text: input.text,
      imageUrl: input.image ?? null,
      poll: input.poll
        ? {
            question: input.poll.question,
            anonymous: input.poll.anonymous ?? true,
            multi: input.poll.multi ?? false,
            closed: input.poll.closed ?? false,
            options: input.poll.options.map((o) => ({ id: o.id, text: o.text })),
          }
        : null,
    });
    await refetch();
  },

  async updatePost(id: string, patch: Partial<Pick<FeedPost, "text" | "image" | "pinned">>) {
    const prev = POSTS.find((p) => p.id === id);
    if (prev) {
      patchPostLocal(id, (p) => ({
        ...p,
        ...(patch.text !== undefined ? { text: patch.text } : {}),
        ...(patch.image !== undefined ? { image: patch.image } : {}),
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
      }));
    }
    try {
      await patchPost(id, {
        ...(patch.text !== undefined ? { text: patch.text } : {}),
        ...(patch.image !== undefined ? { imageUrl: patch.image ?? null } : {}),
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
      });
    } catch {
      if (prev) patchPostLocal(id, () => prev);
    }
  },

  async removePost(id: string) {
    const prev = POSTS;
    POSTS = POSTS.filter((p) => p.id !== id);
    emit();
    try {
      await deletePost(id);
    } catch {
      POSTS = prev;
      emit();
    }
  },

  async addComment(postId: string, input: { author: FeedAuthor; text: string }) {
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: FeedComment = {
      id: tempId,
      author: input.author,
      authorId: input.author.id,
      authorSlug: input.author.slug,
      isBlogger: input.author.isBlogger,
      time: "только что",
      createdAt: new Date().toISOString(),
      text: input.text,
      likes: 0,
      liked: false,
    };
    patchPostLocal(postId, (p) => ({
      ...p,
      comments: [...p.comments, optimistic],
      commentsCount: p.commentsCount + 1,
    }));
    try {
      const created = await addCommentApi(postId, input.text);
      const real = mapComment(created);
      patchPostLocal(postId, (p) => ({
        ...p,
        comments: p.comments.map((c) => (c.id === tempId ? real : c)),
      }));
    } catch {
      patchPostLocal(postId, (p) => ({
        ...p,
        comments: p.comments.filter((c) => c.id !== tempId),
        commentsCount: Math.max(0, p.commentsCount - 1),
      }));
    }
  },

  async removeComment(postId: string, commentId: string) {
    const prev = POSTS.find((p) => p.id === postId);
    const prevComments = prev?.comments ?? [];
    const prevCount = prev?.commentsCount ?? prevComments.length;
    patchPostLocal(postId, (p) => ({
      ...p,
      comments: p.comments.filter((c) => c.id !== commentId),
      commentsCount: Math.max(0, p.commentsCount - 1),
    }));
    try {
      await deleteCommentApi(commentId);
    } catch {
      patchPostLocal(postId, (p) => ({ ...p, comments: prevComments, commentsCount: prevCount }));
    }
  },

  /**
   * Загружает полный список коментов для поста и кладёт в стор.
   * Вызывается при открытии шита коментов.
   */
  async loadFullComments(postId: string) {
    try {
      const detail = await fetchPost(postId);
      patchPostLocal(postId, (p) =>
        keepLoadedComments(p, {
          ...p,
          comments: detail.comments.map(mapComment),
          commentsCount: detail.commentsCount,
          commentsFull: true,
        }),
      );
    } catch {
      /* молча — UI покажет то что уже есть */
    }
  },

  async toggleLike(postId: string, liked: boolean) {
    const prev = POSTS.find((p) => p.id === postId);
    if (!prev) return;
    patchPostLocal(postId, (p) => ({
      ...p,
      liked,
      likes: Math.max(0, prev.likes + (liked ? 1 : 0) - (prev.liked ? 1 : 0)),
    }));
    try {
      if (liked) await likePost(postId);
      else await unlikePost(postId);
    } catch {
      patchPostLocal(postId, () => prev);
      haptic("warning");
      hhToast.error(liked ? "Не удалось поставить лайк" : "Не удалось снять лайк");
    }
  },

  async votePoll(postId: string, optionIds: string[]) {
    const prev = POSTS.find((p) => p.id === postId);
    if (!prev || !prev.poll) return;
    const oldVote = prev.poll.myVote ?? [];
    const nextPoll: FeedPoll = {
      ...prev.poll,
      myVote: optionIds,
      options: prev.poll.options.map((o) => {
        const wasMine = oldVote.includes(o.id);
        const isMine = optionIds.includes(o.id);
        return { ...o, votes: Math.max(0, o.votes + (isMine ? 1 : 0) - (wasMine ? 1 : 0)) };
      }),
    };
    patchPostLocal(postId, (p) => ({ ...p, poll: nextPoll }));
    try {
      await votePoll(postId, optionIds);
    } catch {
      patchPostLocal(postId, () => prev);
    }
  },

  async unvotePoll(postId: string) {
    const prev = POSTS.find((p) => p.id === postId);
    if (!prev || !prev.poll) return;
    const oldVote = prev.poll.myVote ?? [];
    const nextPoll: FeedPoll = {
      ...prev.poll,
      myVote: [],
      options: prev.poll.options.map((o) => ({
        ...o,
        votes: Math.max(0, o.votes - (oldVote.includes(o.id) ? 1 : 0)),
      })),
    };
    patchPostLocal(postId, (p) => ({ ...p, poll: nextPoll }));
    try {
      await unvotePoll(postId);
    } catch {
      patchPostLocal(postId, () => prev);
    }
  },

  async toggleCommentLike(commentId: string, liked: boolean) {
    const post = POSTS.find((p) => p.comments.some((c) => c.id === commentId));
    if (!post) return;
    const prevComment = post.comments.find((c) => c.id === commentId)!;
    patchPostLocal(post.id, (p) => ({
      ...p,
      comments: p.comments.map((c) =>
        c.id === commentId
          ? {
              ...c,
              liked,
              likes: Math.max(0, prevComment.likes + (liked ? 1 : 0) - (prevComment.liked ? 1 : 0)),
            }
          : c,
      ),
    }));
    try {
      if (liked) await likeComment(commentId);
      else await unlikeComment(commentId);
    } catch {
      patchPostLocal(post.id, (p) => ({
        ...p,
        comments: p.comments.map((c) => (c.id === commentId ? prevComment : c)),
      }));
      haptic("warning");
      hhToast.error(liked ? "Не удалось поставить лайк" : "Не удалось снять лайк");
    }
  },
};

// Дебаунс полного рефетча — только для событий, меняющих состав ленты.
let refetchTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRefetch(delay = 500) {
  if (refetchTimer != null) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    if (document.visibilityState !== "hidden") refetch();
  }, delay);
}

// Гранулярный рефетч одного поста: один HTTP-запрос вместо всей ленты.
const postTimers = new Map<string, ReturnType<typeof setTimeout>>();
async function refetchPostNow(postId: string) {
  if (!POSTS.some((p) => p.id === postId)) return;
  if (document.visibilityState === "hidden") return;
  try {
    const prev = POSTS.find((p) => p.id === postId);
    const detail = await fetchPost(postId);
    const next = keepLoadedComments(prev, mapPost({ ...detail, comments: detail.comments }));
    POSTS = POSTS.map((p) => (p.id === postId ? next : p));
    emit();
  } catch {
    /* молча */
  }
}
function schedulePostRefetch(postId: string, delay = 350) {
  const prev = postTimers.get(postId);
  if (prev) clearTimeout(prev);
  postTimers.set(
    postId,
    setTimeout(() => {
      postTimers.delete(postId);
      void refetchPostNow(postId);
    }, delay),
  );
}

function findPostIdByCommentId(commentId: string): string | null {
  for (const p of POSTS) {
    if (p.comments.some((c) => c.id === commentId)) return p.id;
  }
  return null;
}

function removeCommentLocal(commentId: string) {
  const postId = findPostIdByCommentId(commentId);
  if (!postId) return;
  patchPostLocal(postId, (p) => ({
    ...p,
    comments: p.comments.filter((c) => c.id !== commentId),
    commentsCount: Math.max(0, p.commentsCount - 1),
  }));
}

export function useFeedLoaded(): boolean {
  useSyncExternalStore(feedStore.subscribe, feedStore.getSnapshot, feedStore.getSnapshot);
  return loaded;
}

export function useFeedPagination(): { hasMore: boolean; loadingMore: boolean } {
  useSyncExternalStore(feedStore.subscribe, feedStore.getSnapshot, feedStore.getSnapshot);
  return { hasMore: nextCursor !== null, loadingMore };
}

export function useFeedPosts(): FeedPost[] {
  const snap = useSyncExternalStore(feedStore.subscribe, feedStore.getSnapshot, feedStore.getSnapshot);
  useEffect(() => {
    if (!loaded && !pending) refetch();

    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const startPolling = () => {
      if (pollTimer != null) return;
      pollTimer = setInterval(() => {
        if (document.visibilityState === "visible") refetch();
      }, 20_000);
    };
    const stopPolling = () => {
      if (pollTimer != null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connect = () => {
      if (stopped) return;
      if (document.visibilityState === "hidden") return;
      if (es) return;
      try {
        es = new EventSource(`${BACKEND_URL}/api/v1/feed/stream`, { withCredentials: true });
      } catch {
        startPolling();
        return;
      }
      const parsePayload = (e: MessageEvent): { postId?: string; commentId?: string } => {
        try {
          return typeof e.data === "string" && e.data ? JSON.parse(e.data) : {};
        } catch {
          return {};
        }
      };
      es.addEventListener("post.created", () => scheduleRefetch());
      es.addEventListener("post.deleted", () => scheduleRefetch());
      es.addEventListener("post.updated", (e) => {
        const { postId } = parsePayload(e as MessageEvent);
        if (postId) schedulePostRefetch(postId);
      });
      es.addEventListener("post.liked", (e) => {
        const { postId } = parsePayload(e as MessageEvent);
        if (postId) schedulePostRefetch(postId);
      });
      es.addEventListener("poll.voted", (e) => {
        const { postId } = parsePayload(e as MessageEvent);
        if (postId) schedulePostRefetch(postId);
      });
      es.addEventListener("comment.created", (e) => {
        const { postId } = parsePayload(e as MessageEvent);
        if (postId) schedulePostRefetch(postId);
      });
      es.addEventListener("comment.deleted", (e) => {
        const { commentId } = parsePayload(e as MessageEvent);
        if (commentId) removeCommentLocal(commentId);
      });
      es.addEventListener("comment.liked", (e) => {
        const { commentId } = parsePayload(e as MessageEvent);
        if (!commentId) return;
        const postId = findPostIdByCommentId(commentId);
        if (postId) schedulePostRefetch(postId);
      });

      es.onopen = () => stopPolling();
      es.onerror = () => {
        startPolling();
      };
    };

    const disconnect = () => {
      if (es) {
        es.close();
        es = null;
      }
      stopPolling();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refetch();
        connect();
      } else {
        disconnect();
      }
    };
    const onFocus = () => refetch();

    connect();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      stopped = true;
      disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  return snap;
}
