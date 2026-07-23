// Публичный API новостной ленты. Тонкая обёртка над /api/v1/news для
// TanStack Query — заменил mockNewsStore на реальные данные.
//
// Оптимистичный лайк: сразу правим кэш, при ошибке откатываем.

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
