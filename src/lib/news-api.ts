// Публичный API новостной ленты: посты, лайки, комментарии.
// Тонкая обёртка над /api/v1/news для TanStack Query.


import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

export type NewsPost = {
  id: string;
  category: string;
  title: string;
  text: string;
  image?: string;
  createdAt: string;
  likes: number;
  liked: boolean;
  commentsCount: number;
};

type NewsListResponse = { items: NewsPost[]; nextCursor: string | null };

const LIST_KEY = ["news", "list"] as const;

export function useNewsPosts() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const res = await apiFetch<NewsListResponse>("/api/v1/news/?limit=20");
      return res.items;
    },
    staleTime: 30_000,
  });
}

export function useNewsPostById(id: string) {
  return useQuery({
    queryKey: ["news", "one", id],
    queryFn: async () => {
      const res = await apiFetch<{ post: NewsPost }>(`/api/v1/news/${id}`);
      return res.post;
    },
    enabled: !!id,
  });
}

/**
 * Оптимистично переключает лайк для поста в кэше списка и одиночного поста.
 * При ошибке откатывает. Синхронизация с бэком — на следующем рефетче.
 */
export function useToggleNewsLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      await apiFetch(`/api/v1/news/${id}/like`, { method: next ? "POST" : "DELETE" });
      return { id, next };
    },
    onMutate: async ({ id, next }) => {
      await qc.cancelQueries({ queryKey: ["news"] });
      const prevList = qc.getQueryData<NewsPost[]>(LIST_KEY);
      const prevOne = qc.getQueryData<NewsPost>(["news", "one", id]);
      const patch = (p: NewsPost): NewsPost =>
        p.id === id
          ? { ...p, liked: next, likes: Math.max(0, p.likes + (next ? 1 : 0) - (p.liked ? 1 : 0)) }
          : p;
      if (prevList) qc.setQueryData<NewsPost[]>(LIST_KEY, prevList.map(patch));
      if (prevOne) qc.setQueryData<NewsPost>(["news", "one", id], patch(prevOne));
      return { prevList, prevOne };
    },
    onError: (_e, { id }, ctx) => {
      if (ctx?.prevList) qc.setQueryData(LIST_KEY, ctx.prevList);
      if (ctx?.prevOne) qc.setQueryData(["news", "one", id], ctx.prevOne);
    },
  });
}

// ─── Комментарии ────────────────────────────────────────────────────

export type NewsComment = {
  id: string;
  postId: string;
  parentId: string | null;
  text: string;
  imageUrl: string | null;
  createdAt: string;
  editedAt: string | null;
  authorId: string;
  nick: string;
  role: string;
  avatarUrl: string | null;
  rankId: string;
  likes: number;
  liked: boolean;
};

const commentsKey = (postId: string) => ["news", "comments", postId] as const;

export function useNewsComments(postId: string, enabled = true) {
  return useQuery({
    queryKey: commentsKey(postId),
    queryFn: async () => {
      const res = await apiFetch<{ items: NewsComment[] }>(`/api/v1/news/${postId}/comments`);
      return res.items;
    },
    enabled: enabled && !!postId,
    staleTime: 15_000,
  });
}

function bumpCount(qc: ReturnType<typeof useQueryClient>, postId: string, delta: number) {
  const patch = (p: NewsPost): NewsPost =>
    p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount + delta) } : p;
  const list = qc.getQueryData<NewsPost[]>(LIST_KEY);
  if (list) qc.setQueryData<NewsPost[]>(LIST_KEY, list.map(patch));
  const one = qc.getQueryData<NewsPost>(["news", "one", postId]);
  if (one) qc.setQueryData<NewsPost>(["news", "one", postId], patch(one));
}

export function useAddNewsComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { text: string; parentId?: string; imageUrl?: string }) => {
      const res = await apiFetch<{ comment: NewsComment }>(`/api/v1/news/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.comment;
    },
    onSuccess: (comment) => {
      qc.setQueryData<NewsComment[]>(commentsKey(postId), (prev) => [...(prev ?? []), comment]);
      bumpCount(qc, postId, 1);
    },
  });
}

export function useDeleteNewsComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await apiFetch(`/api/v1/news/comments/${commentId}`, { method: "DELETE" });
      return commentId;
    },
    onSuccess: (commentId) => {
      qc.setQueryData<NewsComment[]>(commentsKey(postId), (prev) =>
        (prev ?? []).filter((c) => c.id !== commentId && c.parentId !== commentId),
      );
      bumpCount(qc, postId, -1);
    },
  });
}

/** Оптимистичный лайк комментария: правим кэш сразу, при ошибке откатываем. */
export function useToggleNewsCommentLike(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, next }: { commentId: string; next: boolean }) => {
      await apiFetch(`/api/v1/news/comments/${commentId}/like`, {
        method: next ? "POST" : "DELETE",
      });
      return { commentId, next };
    },
    onMutate: async ({ commentId, next }) => {
      await qc.cancelQueries({ queryKey: commentsKey(postId) });
      const prev = qc.getQueryData<NewsComment[]>(commentsKey(postId));
      if (prev) {
        qc.setQueryData<NewsComment[]>(
          commentsKey(postId),
          prev.map((c) =>
            c.id === commentId
              ? { ...c, liked: next, likes: Math.max(0, c.likes + (next ? 1 : 0) - (c.liked ? 1 : 0)) }
              : c,
          ),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(commentsKey(postId), ctx.prev);
    },
  });
}
