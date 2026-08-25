// API-обёртки админского просмотра чатов Школы. Только чтение: админ видит
// все переписки «ученик ↔ инструктор» и выставленные в них счёта,
// но писать в чат не может.

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";

export type AdminSchoolChatItem = {
  chatId: string;
  instructorId: string;
  instructorName: string;
  instructorSlug: string;
  studentId: string;
  studentNick: string;
  studentAvatar: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageRole: "student" | "instructor";
  studentUnread: number;
  instructorUnread: number;
};

export type AdminSchoolMessage = {
  id: string;
  senderId: string;
  senderRole: "student" | "instructor";
  text: string | null;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AdminSchoolChatOrder = {
  id: string;
  title: string;
  studentAmountRub: number;
  instructorAmountRub: number;
  status: string;
  scheduledAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type AdminSchoolChatResponse = {
  chat: {
    id: string;
    lastMessageAt: string;
    studentUnread: number;
    instructorUnread: number;
  };
  instructor: {
    id: string;
    userId: string;
    displayName: string;
    slug: string;
    avatarUrl: string | null;
  };
  student: { id: string; nick: string; avatarUrl: string | null };
  messages: AdminSchoolMessage[];
  orders: AdminSchoolChatOrder[];
};

const listKey = (instructorId: string | null) =>
  ["admin", "school-chats", "list", instructorId ?? "all"] as const;
const chatKey = (id: string) => ["admin", "school-chats", "chat", id] as const;

export function useAdminSchoolChats(instructorId: string | null) {
  return useQuery({
    queryKey: listKey(instructorId),
    queryFn: async () => {
      const qs = instructorId ? `?instructorId=${instructorId}` : "";
      const res = await apiFetch<{ items: AdminSchoolChatItem[] }>(
        `/api/v1/admin/school/chats${qs}`,
      );
      return res.items;
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useAdminSchoolChat(chatId: string | null) {
  return useQuery({
    queryKey: chatId ? chatKey(chatId) : (["admin", "school-chats", "chat", "none"] as const),
    queryFn: () => apiFetch<AdminSchoolChatResponse>(`/api/v1/admin/school/chats/${chatId}`),
    enabled: !!chatId,
    refetchInterval: 8_000,
    staleTime: 3_000,
  });
}
