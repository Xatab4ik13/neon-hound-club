// Детальная страница одного тира Hell Pass.
// Кнопки оплаты — submit-формы прямо на бекенд `/redirect`, который сам
// создаёт purchase, открывает платёж в Райфе и отвечает 303 на форму банка.
// Это единственный способ, который стабильно работает на iOS/Android PWA
// и в обычных мобильных браузерах: нативный top-level navigation по клику.

import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { PayCardButton, PaySbpButton } from "@/components/brand/PayButton";
import { getTier, type Perk, type Tier } from "@/data/hell-pass";
import { fetchPassMe, qk, type PassTier } from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { BACKEND_URL } from "@/lib/api";
import { isStandalonePWA } from "@/lib/is-pwa";

const TIER_RANK: Record<PassTier, number> = { silver: 1, gold: 2, platinum: 3 };
const PAY_ACTION = `${BACKEND_URL}/api/v1/payments/redirect`;

export const Route = createFileRoute("/club/hell-pass/$tier")({
  loader: ({ params }) => {
    const tier = getTier(params.tier);
    if (!tier) throw notFound();
    return { tier };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.tier.name} — Hell Pass`
          : "Hell Pass",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
  component: TierDetailPage,
});

function NotFoundPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-black uppercase italic tracking-tight">
        Тир не найден
      </h1>
      <Link
        to="/club/hell-pass"
        className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-primary hover:underline"
      >
        ← к списку тиров
      </Link>
    </main>
  );
}

function ErrorPage({ error }: { error: Error }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-black uppercase italic">
        Что-то сломалось
      </h1>
      <p className="mt-3 font-mono text-xs text-muted-foreground">{error.message}</p>
    </main>
  );
}

function TierDetailPage() {
  const { tier } = Route.useLoaderData() as { tier: Tier };
  const { isAuthed } = useViewer();
  const navigate = useNavigate();
  const { sbp: sbpEnabled } = usePaymentMethods();

  const passQ = useQuery({
    queryKey: qk.passMe,
    queryFn: fetchPassMe,
    enabled: isAuthed,
  });
  const active = passQ.data?.active ?? null;
  const daysLeft = passQ.data?.daysLeft ?? null;
  const activeRank = active ? TIER_RANK[active.tier] : 0;
  const targetRank = TIER_RANK[tier.slug as PassTier];
  const isSameTier = active?.tier === tier.slug;
  const isUpgrade = active && targetRank > activeRank;
  const isDowngrade = active && targetRank < activeRank;

  // Перехват submit: если не залогинен — на /login; если даунгрейд — блок.
  const guard = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isAuthed) {
      e.preventDefault();
      navigate({ to: "/login", search: { redirect: `/club/hell-pass/${tier.slug}` } });
      return;
    }
    if (isDowngrade) {
      e.preventDefault();
      return;
    }
  };


  const isPlatinum = tier.ultimate;
  const baseLabel = !isAuthed
    ? "Войти"
    : isDowngrade
      ? `Уже выше — ${active!.tier.toUpperCase()}`
      : isSameTier
        ? "Продлить"
        : isUpgrade
          ? "Апгрейд"
          : "Купить";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <Link
        to="/club/hell-pass"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3 w-3" />
        Все тиры
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-baseline gap-4">
            <h1
              className="font-display text-5xl font-black uppercase italic leading-none tracking-tighter md:text-7xl"
              style={{ color: tier.color }}
            >
              {tier.name}
            </h1>
            {tier.recommended && (
              <span
                className="font-mono text-[10px] font-bold italic uppercase tracking-widest"
                style={{ color: tier.color }}
              >
                ★ Recommended
              </span>
            )}
            {tier.ultimate && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                Ultimate
              </span>
            )}
          </div>

          <p className="mt-4 max-w-2xl text-lg text-white/80">{tier.tagline}</p>

          {tier.inheritsFrom && (
            <div className="mt-3 inline-flex items-center gap-2 border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/60">
              <Check className="h-3 w-3 text-primary" />
              Включает всё из {tier.inheritsFrom}
            </div>
          )}

          <section className="mt-8 border border-white/10 bg-[#0f0f0f] p-6">
            <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-white/60">
              Кому подходит
            </h2>
            <p className="mt-2 text-base text-white/85">{tier.forWhom}</p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-black uppercase italic tracking-tight text-foreground md:text-3xl">
              Что внутри
            </h2>

            <div className="mt-6 space-y-8">
              {tier.groups.map((group) => (
                <div key={group.title}>
                  <h3
                    className="mb-4 font-display text-xs font-black uppercase italic tracking-widest"
                    style={{ color: tier.color }}
                  >
                    {group.title}
                  </h3>
                  <ul className="space-y-4">
                    {group.perks.map((perk, i) => (
                      <PerkDetailRow key={i} perk={perk} tierColor={tier.color} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div
            className="relative overflow-hidden border bg-[#0f0f0f] p-6"
            style={{
              borderColor: `${tier.color}33`,
              boxShadow: isPlatinum ? `0 0 40px -10px ${tier.color}40` : undefined,
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                background: `linear-gradient(135deg, ${tier.color} 0%, transparent 60%)`,
              }}
            />
            <div className="relative">
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">
                Стоимость
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className="font-mono text-4xl font-bold"
                  style={{ color: tier.color }}
                >
                  {tier.price.toLocaleString("ru-RU")} ₽
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-white/40">
                  / 30 дней
                </span>
              </div>

              {active && (
                <div className="mt-4 border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/70">
                  Сейчас активен <span className="text-primary">{active.tier.toUpperCase()}</span>
                  {daysLeft != null && <> · осталось {daysLeft} дн.</>}
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {/* Карта */}
                <form method="POST" action={PAY_ACTION} onSubmit={guard}>
                  <input type="hidden" name="target" value="pass" />
                  <input type="hidden" name="tier" value={tier.slug} />
                  <input type="hidden" name="method" value="card" />
                  <PayCardButton
                    type="submit"
                    disabled={!!isDowngrade}
                    label={!isDowngrade ? `${baseLabel} картой` : baseLabel}
                    size="lg"
                  />
                </form>
                {/* СБП */}
                {sbpEnabled && !isDowngrade && (
                  <form method="POST" action={PAY_ACTION} onSubmit={guard}>
                    <input type="hidden" name="target" value="pass" />
                    <input type="hidden" name="tier" value={tier.slug} />
                    <input type="hidden" name="method" value="sbp" />
                    <PaySbpButton
                      type="submit"
                      label={`${baseLabel} через`}
                      size="lg"
                    />
                  </form>
                )}
              </div>

              <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-white/40">
                {isDowngrade
                  ? "Тир ниже текущего недоступен. Дождись окончания активного пасса."
                  : isSameTier
                    ? "+30 дней к остатку и новый пакет билетов."
                    : isUpgrade
                      ? "Полная цена нового тира. +30 дней к остатку и пакет билетов нового тира."
                      : "Разовый доступ на 30 дней с момента активации. Без автопродления."}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function PerkDetailRow({ perk, tierColor }: { perk: Perk; tierColor: string }) {
  const Icon = perk.icon;
  return (
    <li className="flex items-start gap-4 border-l border-white/[0.06] pl-4">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center border"
        style={{
          borderColor: `${tierColor}40`,
          background: `${tierColor}10`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color: tierColor }} strokeWidth={2} />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          {perk.value && (
            <span
              className="font-mono text-base font-bold"
              style={{ color: tierColor }}
            >
              {perk.value}
            </span>
          )}
          <span className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            {perk.label}
          </span>
        </div>
        {perk.detail && (
          <p className="mt-1 text-sm text-white/65">{perk.detail}</p>
        )}
      </div>
    </li>
  );
}
