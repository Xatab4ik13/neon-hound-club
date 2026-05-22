// Единая точка для React Query-ключей и factory-функций для бэк-эндпоинтов.
// Тонкая обёртка вокруг apiFetch — никакой бизнес-логики, только формы запросов и ответов.

import { apiFetch } from "@/lib/api";

// ---------- TYPES (синхронны с server/src/db/schema) ----------

export type BackendTicketSource =
  | "admin"
  | "quest"
  | "product_bonus"
  | "pass_monthly"
  | "raffle_entry"
  | "refund";

export type LedgerEntry = {
  id: string;
  amount: number; // > 0 начислено, < 0 списано
  source: BackendTicketSource;
  reason: string;
  refType: string | null;
  refId: string | null;
  createdAt: string; // ISO
};

export type PassTier = "silver" | "gold" | "platinum";

export type PassTierInfo = {
  tier: PassTier;
  priceRub: number;
  tickets: number;
  aiQuestions: number | null;
};

export type PassRecord = {
  id: string;
  userId: string;
  tier: PassTier;
  priceRub: number;
  ticketsGranted: number;
  status: "pending_payment" | "active" | "expired" | "cancelled";
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type QuestItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  ticketsReward: number;
  kind: "auto" | "manual";
  repeatable: boolean;
  completed: boolean;
  completedAt: string | null;
};

// ---------- KEYS ----------

export const qk = {
  ticketsBalance: ["tickets", "balance"] as const,
  ticketsHistory: (limit = 30) => ["tickets", "history", limit] as const,
  passTiers: ["pass", "tiers"] as const,
  passMe: ["pass", "me"] as const,
  quests: ["quests", "list"] as const,
};

// ---------- TICKETS ----------

export async function fetchTicketsBalance() {
  return apiFetch<{ balance: number }>("/api/v1/tickets/balance");
}

export async function fetchTicketsHistory(limit = 30) {
  return apiFetch<{ items: LedgerEntry[]; nextCursor: string | null }>(
    `/api/v1/tickets/history?limit=${limit}`,
  );
}

// ---------- HELL PASS ----------

export async function fetchPassTiers() {
  return apiFetch<{ durationDays: number; tiers: PassTierInfo[] }>("/api/v1/pass/tiers");
}

export async function fetchPassMe() {
  return apiFetch<{ active: PassRecord | null; history: PassRecord[] }>("/api/v1/pass/me");
}

export async function purchasePass(tier: PassTier) {
  return apiFetch<{ purchase: PassRecord; paymentUrl: string | null }>(
    "/api/v1/pass/purchase",
    { method: "POST", body: JSON.stringify({ tier }) },
  );
}

// ---------- QUESTS ----------

export async function fetchQuests() {
  return apiFetch<{ items: QuestItem[] }>("/api/v1/quests/");
}

export async function checkQuest(code: string) {
  return apiFetch<
    | { credited: true; completionId: string; tickets: number }
    | { credited: false; reason: string }
  >(`/api/v1/quests/${encodeURIComponent(code)}/check`, { method: "POST" });
}
