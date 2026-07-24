// API-обёртки для клубной части Школы (список инструкторов, карточка,
// чат ученика с инструктором, оплата счёта). Замена мокам `data/instructors.ts`
// и `data/instructor-chats-mock.ts` на этапе студенческого фронта.

import { apiFetch } from "@/lib/api";

// ---------- shared types ----------

export type InstructorTone = "primary" | "yellow" | "cyan" | "lime" | "violet";

export type InstructorSkill = { title: string; text: string };
export type InstructorLocation = {
  address: string;
  lat: number;
  lng: number;
  note?: string;
};
export type InstructorCourse = {
  title: string;
  duration: string;
  price: number;
  priceFrom?: boolean;
  description: string;
  includes?: string[];
};
export type InstructorUpcomingCourse = { title: string };

export type InstructorProfile = {
  specialties?: string[];
  bioParagraphs?: string[];
  skills?: InstructorSkill[];
  courses?: InstructorCourse[];
  upcomingCourses?: InstructorUpcomingCourse[];
  approach?: string[];
  location?: InstructorLocation;
  gallery?: string[];
};

export type InstructorApi = {
  id: string;
  slug: string;
  displayName: string;
  bio: string;
  city: string;
  moto: string;
  avatarUrl: string | null;
  tone: InstructorTone;
  experience: number;
  tagline: string;
  hourlyPriceRub: number;
  profile: InstructorProfile;
};

// ---------- keys ----------

export const schoolQk = {
  instructors: ["school", "instructors"] as const,
  instructor: (slug: string) => ["school", "instructor", slug] as const,
  myChats: ["school", "my-chats"] as const,
  chatMessages: (chatId: string) => ["school", "chat", chatId, "messages"] as const,
};

// ---------- instructors ----------

export async function fetchInstructors() {
  return apiFetch<{ items: InstructorApi[] }>("/api/v1/school/instructors");
}

export async function fetchInstructor(slug: string) {
  return apiFetch<InstructorApi>(`/api/v1/school/instructors/${encodeURIComponent(slug)}`);
}

// ---------- chats ----------

export type MyChatItem = {
  id: string;
  instructorId: string;
  instructorSlug: string;
  instructorName: string;
  instructorAvatar: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageRole: string;
  unread: number;
};

export async function fetchMyChats() {
  return apiFetch<{ items: MyChatItem[] }>("/api/v1/school/chats");
}

export async function openChatWith(instructorSlug: string) {
  return apiFetch<{ id: string }>("/api/v1/school/chats", {
    method: "POST",
    body: JSON.stringify({ instructorSlug }),
  });
}

// ---------- messages + orders ----------

export type ChatSenderRole = "student" | "instructor" | "system";

export type ChatMessageApi = {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: ChatSenderRole;
  text: string | null;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ChatOrderApi = {
  id: string;
  title: string;
  description: string;
  status: "draft" | "invoiced" | "paid" | "cancelled" | "refunded";
  /** Для ученика — сумма с наценкой (студенческая цена). */
  amountRub: number;
  scheduledAt: string | null;
  paidAt: string | null;
  createdAt: string;
  paymentId: string | null;
};

export type ChatMessagesResponse = {
  chat: {
    id: string;
    instructorId: string;
    instructorSlug: string;
    instructorName: string;
    studentId: string;
    lastMessageAt: string;
  };
  messages: ChatMessageApi[];
  orders: ChatOrderApi[];
  viewerRole: "student" | "instructor";
};

export async function fetchChatMessages(chatId: string) {
  return apiFetch<ChatMessagesResponse>(`/api/v1/school/chats/${chatId}/messages`);
}

export async function sendChatMessage(chatId: string, payload: { text?: string; imageUrl?: string }) {
  return apiFetch<{ message: ChatMessageApi }>(`/api/v1/school/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function payOrder(orderId: string, method: "card" | "sbp" = "card") {
  return apiFetch<{ paymentUrl: string | null; paymentId: string }>(
    `/api/v1/school/orders/${orderId}/pay`,
    { method: "POST", body: JSON.stringify({ method }) },
  );
}
