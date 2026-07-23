// API-обёртка веб-чата блогера с подписчиками. Реальный бэк:
//   GET  /api/v1/blogger/chats            — список тредов.
//   GET  /api/v1/blogger/chats/:userId    — история диалога.
//   POST /api/v1/blogger/chats/:userId/messages
//   POST /api/v1/blogger/chats/:userId/read
//
// До деплоя бэка запросы вернут ошибку — UI покажет empty-state, никаких моков.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

export type BloggerChatListItem = {
  threadId: string;
  userId: string;
  peerNick: string;
  peerAvatar: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageRole: "user" | "blogger";
  bloggerUnread: number;
};

export type ChatServerMessage = {
  id: string;
  senderId: string;
  senderRole: "user" | "blogger";
  text: string | null;
  sticker: string | null;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type ThreadResponse = {
  thread: { id: string; unread: number; lastMessageAt: string };
  peer: { id: string; nick: string };
  messages: ChatServerMessage[];
};

const listKey = ["blogger", "chats"] as const;
const threadKey = (userId: string) => ["blogger", "chats", userId] as const;

export function useBloggerChatList() {
  return useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const res = await apiFetch<{ items: BloggerChatListItem[] }>("/api/v1/blogger/chats/");
      return res.items;
    },
    staleTime: 10_000,
  });
}

export function useBloggerChatThread(userId: string) {
  return useQuery({
    queryKey: threadKey(userId),
    queryFn: () => apiFetch<ThreadResponse>(`/api/v1/blogger/chats/${userId}`),
    enabled: !!userId,
    staleTime: 5_000,
  });
}

export function useSendBloggerMessage(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { text?: string; sticker?: string; imageUrl?: string }) => {
      const res = await apiFetch<{ ok: true; message: ChatServerMessage }>(
        `/api/v1/blogger/chats/${userId}/messages`,
        { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } },
      );
      return res.message;
    },
    onSuccess: (msg) => {
      qc.setQueryData<ThreadResponse | undefined>(threadKey(userId), (prev) =>
        prev ? { ...prev, messages: [...prev.messages, msg] } : prev,
      );
      qc.invalidateQueries({ queryKey: listKey });
    },
  });
}
