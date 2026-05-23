// API клиент блогерской рулетки. Бьём в Fastify-бекенд через apiFetch.
import { apiFetch } from "./api";

export type BloggerRaffleListItem = {
  id: string;
  title: string;
  description: string;
  prize: string;
  imageUrl: string | null;
  ticketCost: number;
  startsAt: string;
  endsAt: string;
  status: "draft" | "active" | "finished" | "cancelled";
  createdAt: string;
  updatedAt: string;
  totalEntries: number;
  totalSlots: number;
  totalWinners: number;
};

export type RafflePrizeDto = {
  id: string;
  raffleId: string;
  name: string;
  qty: number;
  position: number;
  createdAt: string;
};

export type RaffleParticipantDto = {
  userId: string;
  nick: string;
  avatarUrl: string | null;
  city: string | null;
  xpTotal: number;
  rankId: string;
  rankLabel: string;
  tickets: number;
};

export type RafflePrizeWinnerDto = {
  id: string;
  prizeId: string;
  userId: string;
  entryId: string;
  nick: string;
  createdAt: string;
};

export type RaffleBoard = {
  raffle: BloggerRaffleListItem;
  prizes: RafflePrizeDto[];
  participants: RaffleParticipantDto[];
  winners: RafflePrizeWinnerDto[];
};

export type DrawResult = {
  ok: true;
  entryId: string;
  userId: string;
  nick: string;
  avatarUrl: string | null;
  city: string | null;
  xpTotal: number;
  rankId: string;
  rankLabel: string;
};

export type ConfirmResult = {
  ok: true;
  winnerId: string;
  raffleFinished: boolean;
};

export const bloggerQk = {
  list: ["blogger", "raffles", "list"] as const,
  board: (id: string) => ["blogger", "raffles", "board", id] as const,
};

export function fetchBloggerRaffles() {
  return apiFetch<{ items: BloggerRaffleListItem[] }>("/api/v1/blogger/raffles/");
}

export function fetchRaffleBoard(id: string) {
  return apiFetch<RaffleBoard>(`/api/v1/blogger/raffles/${id}/board`);
}

export function drawPrizeWinner(raffleId: string, prizeId: string) {
  return apiFetch<DrawResult>(
    `/api/v1/blogger/raffles/${raffleId}/prizes/${prizeId}/draw`,
    { method: "POST" },
  );
}

export function confirmPrizeWinner(raffleId: string, prizeId: string, entryId: string) {
  return apiFetch<ConfirmResult>(
    `/api/v1/blogger/raffles/${raffleId}/prizes/${prizeId}/confirm`,
    { method: "POST", body: JSON.stringify({ entryId }) },
  );
}

// ---------- admin prize CRUD ----------

export function fetchRafflePrizes(raffleId: string) {
  return apiFetch<{ items: RafflePrizeDto[] }>(`/api/v1/admin/raffles/${raffleId}/prizes`);
}

export function createRafflePrize(
  raffleId: string,
  data: { name: string; qty: number; position?: number },
) {
  return apiFetch<RafflePrizeDto>(`/api/v1/admin/raffles/${raffleId}/prizes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function patchRafflePrize(
  prizeId: string,
  patch: { name?: string; qty?: number; position?: number },
) {
  return apiFetch<RafflePrizeDto>(`/api/v1/admin/raffles/prizes/${prizeId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteRafflePrize(prizeId: string) {
  return apiFetch<void>(`/api/v1/admin/raffles/prizes/${prizeId}`, { method: "DELETE" });
}
