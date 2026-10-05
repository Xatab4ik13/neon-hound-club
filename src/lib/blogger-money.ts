import { apiFetch } from "@/lib/api";

export type BloggerMoneyResponse = {
  amountRub: number;
  preorderRub: number;
  range: { from: string; to: string };
};

export function fetchBloggerMoney(from: string, to: string) {
  const search = new URLSearchParams({ from, to });
  return apiFetch<BloggerMoneyResponse>(`/api/v1/blogger/money/?${search.toString()}`);
}