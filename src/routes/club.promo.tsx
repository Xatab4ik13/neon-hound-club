import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/club/PageHeader";
import { useViewer } from "@/hooks/use-viewer";
import { hhToast } from "@/lib/hh-toast";
import {
  fetchMyPromoCodes,
  promoQk,
  promoTargetIds,
  promoTargetLabel,
  type PromoCodeDto,
} from "@/lib/promo-api";
import { CheckCircle2 } from "@/components/ui/icons";

export const Route = createFileRoute("/club/promo")({
  head: () => ({
    meta: [
      { title: "Промокоды — клуб HELLHOUND" },
      { name: "description", content: "Мои промокоды для магазина клуба." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromoPage,
});

function statusOf(p: PromoCodeDto): { label: string; tone: string } | null {
  if (p.usedAt) return { label: "Использован", tone: "text-muted-foreground" };
  if (p.expired) return { label: "Истёк", tone: "text-destructive" };
  return null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function PromoPage() {
  const { isAuthed } = useViewer();
  const { data, isLoading } = useQuery({
    queryKey: promoQk.mine,
    queryFn: fetchMyPromoCodes,
    enabled: isAuthed,
  });
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      hhToast.success("Промокод скопирован");
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1600);
    } catch {
      hhToast.error("Не удалось скопировать");
    }
  };

  const items = data?.items ?? [];

  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-5 md:px-8 md:py-8"
      style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
    >
      <PageHeader title="Промокоды" subtitle="Нажми на код, чтобы скопировать" />

      {isLoading ? (
        <ul className="space-y-2.5">
          {[0, 1].map((i) => (
            <li key={i} className="h-20 animate-pulse rounded-2xl bg-card/40" />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-5 py-8 text-center">
          <div className="font-display text-lg font-black uppercase text-foreground">
            Промокодов пока нет
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Персональные промокоды выдаёт клуб — за активность и в акциях.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((p) => {
            const st = statusOf(p);
            const disabled = !!st;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void copy(p.code)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3.5 text-left transition-colors enabled:hover:border-primary/40 disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-xl font-black uppercase tracking-tight text-foreground">
                      {p.code}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {p.expiresAt ? `до ${formatDate(p.expiresAt)}` : "без срока"}
                      {promoTargetIds(p).length > 0
                        ? ` · на «${promoTargetLabel(p) ?? "товар"}»`
                        : ""}
                    </div>

                    {st ? (
                      <div className={`mt-1 text-[11px] ${st.tone}`}>{st.label}</div>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-xl bg-primary/15 px-3 py-1.5 font-display text-base font-black text-primary">
                    −{p.discountPct}%
                  </span>
                  {copied === p.code ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 px-1 text-[12px] leading-relaxed text-muted-foreground">
        Скидка по промокоду действует только на товары — доставка считается без скидки.
        С скидкой Hell Pass не суммируется: применится большая из двух.
      </p>
    </main>
  );
}
