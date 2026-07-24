// API-обёртки для клубной части Школы (список инструкторов, карточка,
// чат ученика с инструктором, оплата счёта). Замена мокам `data/instructors.ts`
// и `data/instructor-chats-mock.ts` на этапе студенческого фронта.

import { apiFetch } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";

// Перезаписываем `/__l5e/...` на абсолютные CDN-URL, т.к. на проде hhr.pro
// такой префикс не обслуживается (vite-плагин трогает только .asset.json).
function normalizeInstructor(x: InstructorApi): InstructorApi {
  const gallery = (x.profile?.gallery ?? [])
    .map((u) => resolveAssetUrl(u))
    .filter((u): u is string => !!u);
  return {
    ...x,
    avatarUrl: resolveAssetUrl(x.avatarUrl),
    profile: { ...x.profile, gallery },
  };
}

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
  instructorMe: ["school", "instructor-me"] as const,
  instructorChats: ["school", "instructor-chats"] as const,
  instructorOrders: ["school", "instructor-orders"] as const,
};

// ---------- instructors ----------

export async function fetchInstructors() {
  const res = await apiFetch<{ items: InstructorApi[] }>("/api/v1/school/instructors");
  return { items: res.items.map(normalizeInstructor) };
}

export async function fetchInstructor(slug: string) {
  const res = await apiFetch<InstructorApi>(`/api/v1/school/instructors/${encodeURIComponent(slug)}`);
  return normalizeInstructor(res);
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

// =========================================================================
// INSTRUCTOR side (для аккаунтов, у которых есть строка в school_instructors)
// =========================================================================

export type InstructorMeApi = {
  instructor: {
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
    city: string;
    active: boolean;
    hourlyRateRub: number;
  };
};

export async function fetchInstructorMe() {
  return apiFetch<InstructorMeApi>("/api/v1/instructor/me");
}

export type InstructorChatRow = {
  id: string;
  studentId: string;
  studentNick: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageRole: string;
  unread: number;
};

export async function fetchInstructorChats() {
  return apiFetch<{ items: InstructorChatRow[] }>("/api/v1/instructor/chats");
}

export type InstructorOrderRow = {
  id: string;
  chatId: string;
  studentId: string;
  studentNick: string;
  title: string;
  description: string;
  /** Сумма инструктора (без наценки платформы). */
  amountRub: number;
  status: "draft" | "invoiced" | "paid" | "cancelled" | "refunded";
  scheduledAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export async function fetchInstructorOrders() {
  return apiFetch<{ items: InstructorOrderRow[] }>("/api/v1/instructor/orders");
}

export async function createInstructorOrder(payload: {
  chatId: string;
  title: string;
  description: string;
  instructorAmountRub: number;
  scheduledAt?: string;
}) {
  return apiFetch<{ id: string }>("/api/v1/instructor/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cancelInstructorOrder(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/instructor/orders/${id}/cancel`, {
    method: "POST",
  });
}

// =========================================================================
// ADMIN side (`/api/v1/admin/school`)
// =========================================================================

export const adminSchoolQk = {
  kpi: (days: number) => ["admin-school", "kpi", days] as const,
  instructors: ["admin-school", "instructors"] as const,
  payouts: (status?: string) => ["admin-school", "payouts", status ?? "all"] as const,
};

export type AdminKpi = {
  days: number;
  lessons: number;
  gross: number;
  instructorPayouts: number;
  commission: number;
};

export async function fetchAdminKpi(days = 30) {
  return apiFetch<AdminKpi>(`/api/v1/admin/school/kpi?days=${days}`);
}

export type AdminInstructorRow = {
  id: string;
  slug: string;
  displayName: string;
  city: string;
  active: boolean;
  hourlyRateRub: number;
};

export async function fetchAdminInstructors() {
  return apiFetch<{ items: AdminInstructorRow[] }>("/api/v1/admin/school/instructors");
}

export type AdminPayoutRow = {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorSlug: string;
  periodStart: string;
  periodEnd: string;
  grossRub: number;
  taxRub: number;
  commissionRub: number;
  payoutRub: number;
  status: "pending" | "paid";
  paidAt: string | null;
  createdAt: string;
};

export async function fetchAdminPayouts(status?: "pending" | "paid") {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<{ items: AdminPayoutRow[] }>(`/api/v1/admin/school/payouts${qs}`);
}

export async function generatePayouts(payload: {
  periodStart: string;
  periodEnd: string;
  taxRatePercent?: number;
}) {
  return apiFetch<{ created: number; ids: string[] }>(
    "/api/v1/admin/school/payouts/generate",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function markPayoutPaid(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/school/payouts/${id}/mark-paid`, {
    method: "POST",
  });
}
