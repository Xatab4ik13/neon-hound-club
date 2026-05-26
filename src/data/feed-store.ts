// API-backed адаптер ленты. Снаружи интерфейс совпадает с прежним моком,
// внутри — реальные вызовы Fastify (см. server/src/routes/feed.ts).

import { useSyncExternalStore, useEffect } from "react";
import { BACKEND_URL } from "@/lib/api";
import {
  fetchFeed,
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
import { PUBLIC_USERS, type PublicUser } from "./users";
import { hhToast } from "@/lib/hh-toast";

// ───────── Внешние типы (контракт UI) ─────────

export type FeedComment = {
  id: string;
  authorId: string;
  authorSlug: string;
  time: string;
  text: string;
  likes: number;
  liked: boolean;
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
  authorId: string;
  authorSlug: string;
  time: string;
  text: string;
  image?: string;
  poll?: FeedPoll;
  likes: number;
  liked: boolean;
  pinned?: boolean;
  isBlogger: boolean;
  comments: FeedComment[];
};

// ───────── Маппинг автор → PUBLIC_USERS (runtime) ─────────

function makeSlug(nick: string): string {
  return nick
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

function initialsOf(nick: string): string {
  const t = nick.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function ensurePublicUser(input: {
  id: string;
  nick: string;
  role: string | null;
  avatarUrl: string | null;
  city: string | null;
  rankId?: string | null;
}): string {
  const slug = makeSlug(input.nick);
  const isBlogger = input.role === "blogger";
  const role: PublicUser["role"] =
    input.role === "admin" ? "owner" : input.role === "blogger" ? "team" : "rider";
  const nextAvatar = input.avatarUrl ?? undefined;
  const nextCity = input.city ?? undefined;
  const nextInitials = initialsOf(input.nick);
  const nextRank = (input.rankId ?? null) as PublicUser["rank"] | null;
  if (PUBLIC_USERS[slug]) {
    const cur = PUBLIC_USERS[slug];
    const nextBlogger = input.role == null ? cur.isBlogger === true : isBlogger;
    const resolvedRank = nextRank ?? cur.rank;
    if (
      cur.nick !== input.nick ||
      cur.initials !== nextInitials ||
      cur.role !== role ||
      cur.city !== nextCity ||
      cur.avatarUrl !== nextAvatar ||
      cur.isBlogger !== nextBlogger ||
      cur.rank !== resolvedRank
    ) {
      PUBLIC_USERS[slug] = {
        ...cur,
        nick: input.nick,
        initials: nextInitials,
        role,
        city: nextCity,
        avatarUrl: nextAvatar,
        isBlogger: nextBlogger,
        rank: resolvedRank,
      };
    }
    return slug;
  }
  PUBLIC_USERS[slug] = {
    slug,
    nick: input.nick,
    initials: nextInitials,
    rank: nextRank ?? "rookie",
    xpPct: 0,
    role,
    isBlogger,
    city: nextCity,
    joined: "",
    badgeIds: [],
    wins: [],
    avatarUrl: nextAvatar,
  };
  return slug;
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
  const slug = ensurePublicUser({
    id: c.authorId,
    nick: c.nick,
    role: c.role,
    avatarUrl: c.avatarUrl,
    city: null,
    rankId: c.rankId,
  });
  return {
    id: c.id,
    authorId: c.authorId,
    authorSlug: slug,
    time: formatRelative(c.createdAt),
    text: c.text,
    likes: c.likes,
    liked: c.liked,
    isBlogger: c.role === "blogger",
  };
}

export type FeedPostWithComments = FeedPostHydrated & { comments?: FeedCommentHydrated[] };

export function mapPost(p: FeedPostWithComments): FeedPost {
  const slug = ensurePublicUser({
    id: p.author.id,
    nick: p.author.nick,
    role: p.author.role,
    avatarUrl: p.author.avatarUrl,
    city: p.author.city,
    rankId: p.author.rankId,
  });
  return {
    id: p.id,
    authorId: p.author.id,
    authorSlug: slug,
    time: formatRelative(p.createdAt),
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
    isBlogger: p.author.role === "blogger",
    comments: (p.comments ?? []).map(mapComment),
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
      POSTS = r.items.map(mapPost);
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
    // дедуп по id (на случай гонок со SSE-рефетчем)
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
  /** Принудительно перечитать ленту с бэка. */
  refresh: refetch,
  /** Подгрузить следующую страницу (для infinite scroll). */
  loadMore,

  async addPost(input: { text: string; image?: string; authorSlug: string; poll?: FeedPoll }) {
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

  async addComment(postId: string, input: { authorSlug: string; text: string }) {
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: FeedComment = {
      id: tempId,
      authorId: "me",
      authorSlug: input.authorSlug,
      time: "только что",
      text: input.text,
      likes: 0,
      liked: false,
      isBlogger: false,
    };
    patchPostLocal(postId, (p) => ({ ...p, comments: [...p.comments, optimistic] }));
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
      }));
    }
  },

  async removeComment(postId: string, commentId: string) {
    const prev = POSTS.find((p) => p.id === postId)?.comments ?? [];
    patchPostLocal(postId, (p) => ({ ...p, comments: p.comments.filter((c) => c.id !== commentId) }));
    try {
      await deleteCommentApi(commentId);
    } catch {
      patchPostLocal(postId, (p) => ({ ...p, comments: prev }));
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
    }
  },
};

// Дебаунс-рефетча, чтобы пачку событий от бэка склеивать в один запрос.
let refetchTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRefetch(delay = 500) {
  if (refetchTimer != null) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    if (document.visibilityState !== "hidden") refetch();
  }, delay);
}

export function useFeedLoaded(): boolean {
  // подписываемся на тот же стор — после первой загрузки emit() триггерит ре-рендер
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

    // ─── Live: SSE-подписка на /api/v1/feed/stream ───
    // На любое событие (post/comment/like/poll) делаем дебаунс-рефетч.
    // Если SSE недоступен — fallback на редкий polling (раз в 20с).
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
      if (document.visibilityState === "hidden") return; // не открываем сокет в фоне
      if (es) return;
      try {
        es = new EventSource(`${BACKEND_URL}/api/v1/feed/stream`, { withCredentials: true });
      } catch {
        startPolling();
        return;
      }
      const onAny = () => scheduleRefetch();
      es.addEventListener("post.created", onAny);
      es.addEventListener("post.updated", onAny);
      es.addEventListener("post.deleted", onAny);
      es.addEventListener("comment.created", onAny);
      es.addEventListener("comment.deleted", onAny);
      es.addEventListener("post.liked", onAny);
      es.addEventListener("comment.liked", onAny);
      es.addEventListener("poll.voted", onAny);
      es.onopen = () => stopPolling();
      es.onerror = () => {
        // EventSource сам переподключится; на всякий случай подстрахуемся polling-ом.
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
        // В фоне SSE и polling не нужны — экономим батарею и трафик.
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
