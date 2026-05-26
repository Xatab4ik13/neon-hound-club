// Клиент для прокси DaData на нашем бэке (/api/v1/dadata/suggest/*).
import { apiFetch } from "./api";

export type DadataSuggestType = "fio" | "email" | "address" | "party" | "bank";

export type DadataSuggestion<T = Record<string, unknown>> = {
  value: string;
  unrestricted_value: string;
  data: T;
};

export type DadataAddressData = {
  country?: string | null;
  region?: string | null;
  region_with_type?: string | null;
  city?: string | null;
  city_with_type?: string | null;
  settlement?: string | null;
  settlement_with_type?: string | null;
  street_with_type?: string | null;
  house?: string | null;
  flat?: string | null;
  postal_code?: string | null;
  fias_id?: string | null;
  kladr_id?: string | null;
  geo_lat?: string | null;
  geo_lon?: string | null;
};

export type DadataFioData = {
  surname?: string | null;
  name?: string | null;
  patronymic?: string | null;
  gender?: "MALE" | "FEMALE" | "UNKNOWN" | null;
};

export type SuggestResponse<T> = { suggestions: DadataSuggestion<T>[] };

export async function suggest<T = Record<string, unknown>>(
  type: DadataSuggestType,
  query: string,
  opts: { count?: number; params?: Record<string, unknown>; signal?: AbortSignal } = {},
): Promise<DadataSuggestion<T>[]> {
  if (!query.trim()) return [];
  try {
    const data = await apiFetch<SuggestResponse<T>>(`/api/v1/dadata/suggest/${type}`, {
      method: "POST",
      body: JSON.stringify({ query, count: opts.count ?? 7, params: opts.params }),
      signal: opts.signal,
    });
    return data?.suggestions ?? [];
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return [];
    return [];
  }
}
