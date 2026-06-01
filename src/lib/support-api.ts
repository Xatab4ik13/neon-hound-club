import { apiFetch } from "@/lib/api";

export type SupportCategory = "bug" | "feature" | "question";
export type SupportStatus = "open" | "answered" | "closed";

export const SUPPORT_CATEGORY_LABEL: Record<SupportCategory, string> = {
  bug: "Баг",
  feature: "Предложение",
  question: "Вопрос",
};

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  open: "Ждёт ответа",
  answered: "Ответ получен",
  closed: "Закрыт",
};

export type SupportTicketListItem = {
  id: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  createdAt: string;
  answeredAt: string | null;
};

export type SupportTicketDetail = SupportTicketListItem & {
  body: string;
  adminReply: string | null;
  closedAt: string | null;
};

export const supportQk = {
  list: (scope: "active" | "closed") => ["support", "tickets", scope] as const,
  detail: (id: string) => ["support", "ticket", id] as const,
};

export function listMyTickets(scope: "active" | "closed") {
  return apiFetch<{ items: SupportTicketListItem[] }>(
    `/api/v1/support/tickets?status=${scope}`,
  );
}

export function getTicket(id: string) {
  return apiFetch<SupportTicketDetail>(`/api/v1/support/tickets/${id}`);
}

export function createTicket(input: {
  category: SupportCategory;
  subject: string;
  body: string;
}) {
  return apiFetch<{ id: string }>(`/api/v1/support/tickets`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---------- ADMIN ----------

export type AdminSupportTicketListItem = SupportTicketListItem & {
  userId: string;
  nick: string | null;
};

export type AdminSupportTicketDetail = SupportTicketDetail & {
  userId: string;
  nick: string | null;
  email: string | null;
};

export function fetchAdminSupportTickets(params: {
  page: number;
  pageSize: number;
  status?: SupportStatus;
  category?: SupportCategory;
}) {
  const q = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.status) q.set("status", params.status);
  if (params.category) q.set("category", params.category);
  return apiFetch<{
    items: AdminSupportTicketListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/api/v1/admin/support/tickets?${q.toString()}`);
}

export function fetchAdminSupportTicket(id: string) {
  return apiFetch<AdminSupportTicketDetail>(`/api/v1/admin/support/tickets/${id}`);
}

export function replyToSupportTicket(id: string, reply: string, close: boolean) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/support/tickets/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply, close }),
  });
}

export function closeSupportTicket(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/support/tickets/${id}/close`, {
    method: "POST",
  });
}

export function fetchAdminSupportUnreadCount() {
  return apiFetch<{ count: number }>(`/api/v1/admin/support/tickets/unread-count`);
}
