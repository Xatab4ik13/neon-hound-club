import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

export type VipChatServerMessage = {
  id: string;
  senderId: string;
  senderRole: "user" | "blogger";
  text: string | null;
  sticker: string | null;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type VipChatThreadResponse = {
  thread: { id: string; unread: number; lastMessageAt: string };
  blogger: { id: string; nick: string };
  messages: VipChatServerMessage[];
};

const threadKey = ["vip-chat", "thread"] as const;

export function useVipChatThread() {
  return useQuery({
    queryKey: threadKey,
    queryFn: () => apiFetch<VipChatThreadResponse>("/api/v1/vip-chat/thread"),
    staleTime: 3_000,
    refetchInterval: 5_000,
  });
}

export function useSendVipChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { text?: string; sticker?: string; imageUrl?: string }) => {
      const res = await apiFetch<{ ok: true; message: VipChatServerMessage }>(
        "/api/v1/vip-chat/messages",
        {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        },
      );
      return res.message;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<VipChatThreadResponse | undefined>(threadKey, (prev) =>
        prev ? { ...prev, messages: [...prev.messages, message] } : prev,
      );
    },
  });
}
