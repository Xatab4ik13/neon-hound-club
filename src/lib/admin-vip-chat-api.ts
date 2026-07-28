// API-обёртки админского VIP-чата. Админ видит все треды по всем блогерам
// и может отвечать «от лица блогера» (сообщение уходит с senderRole='blogger'
// и senderId = thread.bloggerId).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

export type AdminVipChatThreadItem = {
  threadId: string;
  userId: string;
  bloggerId: string;
  peerNick: string;
  peerAvatar: string | null;
  bloggerNick: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageRole: "user" | "blogger";
  bloggerUnread: number;
  userUnread: number;
};

export type AdminVipChatMessage = {
  id: string;
  senderId: string;
  senderRole: "user" | "blogger";
  text: string | null;
  sticker: string | null;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AdminVipChatThreadResponse = {
  thread: {
    id: string;
    bloggerUnread: number;
    userUnread: number;
    lastMessageAt: string;
  };
  peer: { id: string; nick: string; avatarUrl: string | null };
  blogger: { id: string; nick: string };
  messages: AdminVipChatMessage[];
};

const listKey = ["admin", "vip-chat", "threads"] as const;
const threadKey = (id: string) => ["admin", "vip-chat", "thread", id] as const;

export function useAdminVipChatThreads() {
  return useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const res = await apiFetch<{ items: AdminVipChatThreadItem[] }>(
        "/api/v1/admin/vip-chat/threads",
      );
      return res.items;
    },
    refetchInterval: 5_000,
    staleTime: 2_000,
  });
}

export function useAdminVipChatThread(threadId: string | null) {
  return useQuery({
    queryKey: threadId ? threadKey(threadId) : ["admin", "vip-chat", "thread", "none"],
    queryFn: () =>
      apiFetch<AdminVipChatThreadResponse>(`/api/v1/admin/vip-chat/threads/${threadId}`),
    enabled: !!threadId,
    refetchInterval: 3_000,
    staleTime: 1_000,
  });
}

export function useAdminSendVipMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { text?: string; sticker?: string; imageUrl?: string }) => {
      const res = await apiFetch<{ ok: true; message: AdminVipChatMessage }>(
        `/api/v1/admin/vip-chat/threads/${threadId}/messages`,
        {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        },
      );
      return res.message;
    },
    onSuccess: (msg) => {
      qc.setQueryData<AdminVipChatThreadResponse | undefined>(threadKey(threadId), (prev) =>
        prev ? { ...prev, messages: [...prev.messages, msg] } : prev,
      );
      qc.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useAdminMarkVipRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) =>
      apiFetch<{ ok: true }>(`/api/v1/admin/vip-chat/threads/${threadId}/read`, {
        method: "POST",
      }),
    onSuccess: (_res, threadId) => {
      qc.invalidateQueries({ queryKey: listKey });
      qc.invalidateQueries({ queryKey: threadKey(threadId) });
    },
  });
}
