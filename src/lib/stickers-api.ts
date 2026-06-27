// Стикер-паки: какие паки доступны текущему пользователю.
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export const STICKER_PACK_PRODUCT_SLUGS: Record<string, string> = {
  special: "stickerpack-special",
  "hell-minions": "stickerpack-hell-minions",
};

export function useMyStickerPacks(enabled = true) {
  return useQuery({
    queryKey: ["stickers", "me"],
    queryFn: async () => {
      try {
        const r = await apiFetch<{ packs: string[] }>("/api/v1/stickers/me");
        return r.packs;
      } catch (e) {
        if ((e as { status?: number }).status === 401) return [] as string[];
        throw e;
      }
    },
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}
