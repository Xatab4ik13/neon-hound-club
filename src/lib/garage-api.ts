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

export type MyProfile = {
  userId: string;
  email: string;
  nick: string;
  role: "user" | "admin";
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
};

export type PublicProfile = {
  nick: string;
  role: "user" | "admin";
  joinedAt: string;
  city: string | null;
  avatarUrl: string | null;
  bio: string | null;
  instagram: string | null;
  telegram: string | null;
  youtube: string | null;
  bikesCount: number;
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

export type UploadKind = "avatar" | "bike";

type SignResponse = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresIn: number;
};

/** Загружает файл в наш S3 через presigned PUT и возвращает публичный URL. */
export async function uploadFileToS3(
  file: File,
  kind: UploadKind,
  scope?: string,
): Promise<string> {
  const sign = await apiFetch<SignResponse>("/api/v1/uploads/sign", {
    method: "POST",
    body: JSON.stringify({
      kind,
      contentType: file.type,
      size: file.size,
      scope,
    }),
  });
  const res = await fetch(sign.uploadUrl, {
    method: "PUT",
    headers: sign.headers,
    body: file,
  });
  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status}`);
  }
  return sign.publicUrl;
}
