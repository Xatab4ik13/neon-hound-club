// Детальная страница одного тира Hell Pass.
// Кнопки оплаты — submit-формы прямо на бекенд `/redirect`, который сам
// создаёт purchase, открывает платёж в Райфе и отвечает 303 на форму банка.
// Это единственный способ, который стабильно работает на iOS/Android PWA
// и в обычных мобильных браузерах: нативный top-level navigation по клику.

import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { PlumpArrowLeft as ArrowLeft, Check } from "@/components/ui/icons";
import { PayButton } from "@/components/brand/PayButton";
import { hhToast } from "@/lib/hh-toast";
import { getTier, type Perk, type Tier } from "@/data/hell-pass";
import { fetchPassMe, qk, type PassTier } from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";

import { BACKEND_URL } from "@/lib/api";

const TIER_RANK: Record<PassTier, number> = { silver: 1, gold: 2, platinum: 3 };
const PAY_ACTION = `${BACKEND_URL}/api/v1/payments/redirect`;

export const Route = createFileRoute("/club/hell-pass/$tier")({
  validateSearch: (s: Record<string, unknown>): { payment_error?: string } => {
    const v = typeof s.payment_error === "string" ? s.payment_error : undefined;
    return v ? { payment_error: v } : {};
  },
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
      <h1 className="font-display text-3xl font-black uppercase  tracking-tight">
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
      <h1 className="font-display text-2xl font-black uppercase">
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
  const search = Route.useSearch();

  // Если бек вернул нас сюда с ошибкой инициализации платежа — показываем тост.
  useEffect(() => {
    if (search.payment_error) {
      // eslint-disable-next-line no-console
      console.error("[payment_error]", search.payment_error);
      hhToast.error("Ошибка оплаты", { meta: search.payment_error, duration: 15000 });
    }
  }, [search.payment_error]);



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
    ? "Войти и оплатить"
    : isDowngrade
      ? `Уже выше — ${active!.tier.toUpperCase()}`
      : isSameTier
        ? "Продлить на 30 дней"
        : isUpgrade
          ? "Апгрейд — оплатить"
          : "Оплатить";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      {search.payment_error ? (
        <section className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          <div className="font-semibold text-destructive">Не удалось открыть оплату</div>
          <div className="mt-1 text-muted-foreground">{search.payment_error}</div>
        </section>
      ) : null}

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
              className="font-display text-5xl font-black uppercase  leading-none tracking-tighter md:text-7xl"
              style={{ color: tier.color }}
            >
              {tier.name}
            </h1>
            {tier.recommended && (
              <span
                className="font-mono text-[10px] font-bold  uppercase tracking-widest"
                style={{ color: tier.color }}
              >
                ★ Популярный
              </span>
            )}
            {tier.ultimate && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                Максимум
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
            <h2 className="font-display text-sm font-black uppercase  tracking-widest text-white/60">
              Кому подходит
            </h2>
            <p className="mt-2 text-base text-white/85">{tier.forWhom}</p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-black uppercase  tracking-tight text-foreground md:text-3xl">
              Что внутри
            </h2>

            <div className="mt-6 space-y-8">
              {tier.groups.map((group) => (
                <div key={group.title}>
                  <h3
                    className="mb-4 font-display text-xs font-black uppercase  tracking-widest"
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
                  / мес
                </span>
              </div>

              {active && (
                <div className="mt-4 border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/70">
                  Активна подписка <span className="text-primary">{active.tier.toUpperCase()}</span>
                  {daysLeft != null && <> · след. списание через {daysLeft} дн.</>}
                  {isSameTier && cancelled && (
                    <div className="mt-1 normal-case tracking-normal text-destructive">
                      Отменена. Доступ сохранится до конца оплаченного периода.
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {isSameTier && !cancelled ? (
                  // Активный тир — вместо «купить» кнопка отмены подписки.
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="w-full rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 font-display text-sm font-black uppercase tracking-widest text-destructive transition-colors hover:bg-destructive/20"
                  >
                    Отменить подписку
                  </button>
                ) : isSameTier && cancelled ? (
                  <button
                    type="button"
                    onClick={() => setResumeOpen(true)}
                    className="w-full rounded-2xl border border-primary/50 bg-primary/10 px-4 py-3 font-display text-sm font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
                  >
                    Возобновить подписку
                  </button>
                ) : (
                  <form method="POST" action={PAY_ACTION} onSubmit={guard}>
                    <input type="hidden" name="target" value="pass" />
                    <input type="hidden" name="tier" value={tier.slug} />
                    <input type="hidden" name="method" value="sbp" />
                    <PayButton
                      type="submit"
                      disabled={!!isDowngrade}
                      label={baseLabel}
                      size="lg"
                    />
                  </form>
                )}
              </div>


              <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-white/40">
                {isDowngrade
                  ? "Тир ниже текущего недоступен. Дождись окончания активной подписки."
                  : isSameTier
                    ? cancelled
                      ? "Автопродление отключено. Возобнови — и списание пойдёт как раньше."
                      : "Ежемесячное автопродление. Отменить можно в любой момент."
                    : isUpgrade
                      ? "Апгрейд подписки. Списание пойдёт по цене нового тира."
                      : "Ежемесячная подписка. Списывается раз в месяц, отменить можно в любой момент."}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <IOSConfirm
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Отменить подписку?"
        description={`Доступ ${tier.name} сохранится до конца оплаченного периода${
          daysLeft != null ? ` — ещё ${daysLeft} дн.` : ""
        }. После этого автопродления не будет.`}
        confirmLabel="Отменить подписку"
        cancelLabel="Оставить"
        destructive
        onConfirm={() => {
          setPassCancelled(true);
          hhToast.success("Подписка отменена", {
            meta: "Доступ сохранится до конца оплаченного периода",
          });
        }}
      />

      <IOSConfirm
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        title="Возобновить подписку?"
        description="Автопродление включится снова. Следующее списание пойдёт в конце текущего периода."
        confirmLabel="Возобновить"
        cancelLabel="Отмена"
        onConfirm={() => {
          setPassCancelled(false);
          hhToast.success("Подписка возобновлена");
        }}
      />
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
