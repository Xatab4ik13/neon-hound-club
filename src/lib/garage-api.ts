// Клиент-сайд хелперы для гаража и профиля. Тонкая обёртка над apiFetch.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ---------- TYPES ----------

export type ServerBike = {
  id: string;
  userId: string;
  brand: string;
  model: string;
  year: number | null;
  engineCc: number | null;
  color: string | null;
  nickname: string | null;
  notes: string | null;
  mileage: string | null;
  purchaseDate: string | null; // ISO yyyy-mm-dd
  mods: string[];
  photos: string[];
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BikePayload = {
  brand: string;
  model: string;
  year?: number | null;
  engineCc?: number | null;
  color?: string | null;
  nickname?: string | null;
  notes?: string | null;
  mileage?: string | null;
  purchaseDate?: string | null;
  mods?: string[];
  photos?: string[];
  isPrimary?: boolean;
};

export type RankInfo = {
  xp: number;
  rankIndex: number;
  rankId: string;
  rankLabel: string;
  nextLabel: string | null;
  pct: number;
  inRank: number;
  span: number;
  toNext: number;
  isMax: boolean;
};

export type MyProfile = {
  userId: string;
  email: string;
  nick: string;
  role: "user" | "admin" | "blogger";
  emailVerified: boolean;
  joinedAt: string;
  phone: string | null;
  city: string | null;
  avatarUrl: string | null;
  bio: string | null;
  instagram: string | null;
  telegram: string | null;
  youtube: string | null;
  bikesCount: number;
  xpTotal: number;
  rank: RankInfo;
};

export type PublicProfile = {
  nick: string;
  role: "user" | "admin" | "blogger";
  joinedAt: string;
  city: string | null;
  avatarUrl: string | null;
  bio: string | null;
  instagram: string | null;
  telegram: string | null;
  youtube: string | null;
  bikesCount: number;
  xpTotal: number;
  rank: RankInfo;
  primaryBike: null | {
    brand: string;
    model: string;
    year: number | null;
    nickname: string | null;
    photo: string | null;
  };
};

// ---------- KEYS ----------

export const gqk = {
  bikes: ["garage", "bikes"] as const,
  myProfile: ["profile", "me"] as const,
  publicProfile: (nick: string) => ["profile", "public", nick.toLowerCase()] as const,
};

// ---------- PROFILE ----------

export function useMyProfile(enabled = true) {
  return useQuery({
    queryKey: gqk.myProfile,
    queryFn: () => apiFetch<MyProfile>("/api/v1/profile/me"),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function usePublicProfile(nick: string) {
  return useQuery({
    queryKey: gqk.publicProfile(nick),
    queryFn: async () => {
      try {
        return await apiFetch<PublicProfile>(`/api/v1/profile/${encodeURIComponent(nick)}`);
      } catch (e) {
        // 404 → null, чтобы компонент решал что показывать.
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      }
    },
    retry: false,
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<MyProfile, "userId" | "email" | "nick" | "role" | "emailVerified" | "joinedAt" | "bikesCount">>) =>
      apiFetch<{ ok: true }>("/api/v1/profile/me", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gqk.myProfile });
    },
  });
}

// ---------- GARAGE ----------

export function useBikes(enabled = true) {
  return useQuery({
    queryKey: gqk.bikes,
    queryFn: () => apiFetch<{ items: ServerBike[] }>("/api/v1/garage/").then((r) => r.items),
    enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useCreateBike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BikePayload) =>
      apiFetch<ServerBike>("/api/v1/garage/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gqk.bikes });
      qc.invalidateQueries({ queryKey: gqk.myProfile });
    },
  });
}

export function useUpdateBike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BikePayload> }) =>
      apiFetch<ServerBike>(`/api/v1/garage/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: gqk.bikes }),
  });
}

export function useDeleteBike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/api/v1/garage/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gqk.bikes });
      qc.invalidateQueries({ queryKey: gqk.myProfile });
    },
  });
}

// ---------- S3 UPLOAD ----------

export type UploadKind = "avatar" | "bike" | "post" | "raffle" | "shop" | "product";

type SignResponse = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresIn: number;
};

/** Загружает файл через бекенд (он положит в S3/MinIO) и возвращает публичный URL. */
export async function uploadFileToS3(
  file: File,
  kind: UploadKind,
  scope?: string,
): Promise<string> {
  const fd = new FormData();
  fd.append("kind", kind);
  if (scope) fd.append("scope", scope);
  fd.append("file", file, file.name);
  const res = await apiFetch<{ key: string; publicUrl: string }>(
    "/api/v1/uploads/direct",
    { method: "POST", body: fd },
  );
  return res.publicUrl;
}


// ---------- DELIVERY ADDRESS ----------

export type DeliveryAddress = {
  userId: string;
  fullName: string;
  phone: string;
  city: string;
  postalCode: string;
  pickupPoint: string;
  comment: string;
};

export const settingsKeys = {
  address: ["settings", "address"] as const,
  notifications: ["settings", "notifications"] as const,
};

export function useMyAddress() {
  return useQuery({
    queryKey: settingsKeys.address,
    queryFn: () => apiFetch<DeliveryAddress>("/api/v1/profile/me/address"),
    staleTime: 30_000,
    retry: false,
  });
}

export function useSaveMyAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Omit<DeliveryAddress, "userId">) =>
      apiFetch<{ ok: true }>("/api/v1/profile/me/address", {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.address }),
  });
}

// ---------- NOTIFICATIONS ----------

export type NotificationPrefs = {
  userId: string;
  emailRaffles: boolean;
  emailOrders: boolean;
  emailNews: boolean;
  pushRaffles: boolean;
  pushOrders: boolean;
  pushNews: boolean;
};

export function useMyNotifications() {
  return useQuery({
    queryKey: settingsKeys.notifications,
    queryFn: () => apiFetch<NotificationPrefs>("/api/v1/profile/me/notifications"),
    staleTime: 30_000,
    retry: false,
  });
}

export function useSaveMyNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<NotificationPrefs, "userId">>) =>
      apiFetch<{ ok: true }>("/api/v1/profile/me/notifications", {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: settingsKeys.notifications });
      const prev = qc.getQueryData<NotificationPrefs>(settingsKeys.notifications);
      if (prev) qc.setQueryData(settingsKeys.notifications, { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(settingsKeys.notifications, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: settingsKeys.notifications }),
  });
}

// ---------- ACCOUNT ----------

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiFetch<{ ok: true }>("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (body: { confirmNick: string }) =>
      apiFetch<{ ok: true }>("/api/v1/auth/me", {
        method: "DELETE",
        body: JSON.stringify(body),
      }),
  });
}
