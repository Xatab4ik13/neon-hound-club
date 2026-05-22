// API-backed адаптер ленты. Снаружи интерфейс совпадает с прежним моком,
// внутри — реальные вызовы Fastify (см. server/src/routes/feed.ts).

import { useSyncExternalStore, useEffect } from "react";
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

// ───────── Внешние типы (контракт UI) ─────────

export type FeedComment = {
  id: string;
  authorSlug: string;
  time: string;
  text: string;
  likes: number;
  liked: boolean;
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
  authorSlug: string;
  time: string;
  text: string;
  image?: string;
  poll?: FeedPoll;
  likes: number;
  liked: boolean;
  pinned?: boolean;
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
}): string {
  const slug = makeSlug(input.nick);
  if (PUBLIC_USERS[slug]) {
    // Обновляем аватар если пришёл свежий.
    if (input.avatarUrl && !PUBLIC_USERS[slug].avatarUrl) {
      PUBLIC_USERS[slug] = { ...PUBLIC_USERS[slug], avatarUrl: input.avatarUrl };
    }
    return slug;
  }
  const role: PublicUser["role"] =
    input.role === "admin" ? "owner" : input.role === "blogger" ? "team" : "rider";
  PUBLIC_USERS[slug] = {
    slug,
    nick: input.nick,
    initials: initialsOf(input.nick),
    rank: "rookie",
    xpPct: 0,
    role,
    city: input.city ?? undefined,
    joined: "",
    badgeIds: [],
    wins: [],
    avatarUrl: input.avatarUrl ?? undefined,
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
    role: null,
    avatarUrl: c.avatarUrl,
    city: null,
  });
  return {
    id: c.id,
    authorSlug: slug,
    time: formatRelative(c.createdAt),
    text: c.text,
    likes: c.likes,
  };
}

type FeedPostWithComments = FeedPostHydrated & { comments?: FeedCommentHydrated[] };

function mapPost(p: FeedPostWithComments): FeedPost {
  const slug = ensurePublicUser({
    id: p.author.id,
    nick: p.author.nick,
    role: p.author.role,
    avatarUrl: p.author.avatarUrl,
    city: p.author.city,
  });
  return {
    id: p.id,
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
          options: p.poll.results.map((o) => ({ id: o.id, text: o.text, votes: o.votes })),
        }
      : undefined,
    likes: p.likes,
    comments: (p.comments ?? []).map(mapComment),
  };
}

// ───────── Reactive store ─────────

let POSTS: FeedPost[] = [];
let loaded = false;
let pending: Promise<void> | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function refetch(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    try {
      const r = await fetchFeed({ limit: 50 });
      POSTS = r.items.map(mapPost);
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
    await patchPost(id, {
      ...(patch.text !== undefined ? { text: patch.text } : {}),
      ...(patch.image !== undefined ? { imageUrl: patch.image ?? null } : {}),
      ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
    });
    await refetch();
  },

  async removePost(id: string) {
    await deletePost(id);
    POSTS = POSTS.filter((p) => p.id !== id);
    emit();
  },

  async addComment(_postId: string, input: { authorSlug: string; text: string }) {
    await addCommentApi(_postId, input.text);
    await refetch();
  },

  async removeComment(_postId: string, commentId: string) {
    await deleteCommentApi(commentId);
    POSTS = POSTS.map((p) =>
      p.id === _postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p,
    );
    emit();
  },

  async toggleLike(postId: string, liked: boolean) {
    // Оптимистично — UI и так держит локальный liked-флаг.
    try {
      if (liked) await likePost(postId);
      else await unlikePost(postId);
    } catch {
      /* noop */
    }
  },

  async votePoll(postId: string, optionIds: string[]) {
    try {
      await votePoll(postId, optionIds);
      await refetch();
    } catch {
      /* noop */
    }
  },
};

export function useFeedPosts(): FeedPost[] {
  const snap = useSyncExternalStore(feedStore.subscribe, feedStore.getSnapshot, feedStore.getSnapshot);
  // На клиенте, если ещё не грузили — триггерим один раз.
  useEffect(() => {
    if (!loaded && !pending) refetch();
  }, []);
  return snap;
}
