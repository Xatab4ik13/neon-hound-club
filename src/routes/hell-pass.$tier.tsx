// Публичная детальная страница тира Hell Pass (для незалогиненных).
// Аналог /club/hell-pass/$tier, но в публичном лэйауте и с CTA «Войти и оформить».

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PlumpArrowLeft as ArrowLeft, Check } from "@/components/ui/icons";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { getTier, type Perk, type Tier } from "@/data/hell-pass";

export const Route = createFileRoute("/hell-pass/$tier")({
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
      {
        name: "description",
        content: loaderData?.tier.tagline ?? "Тир подписки Hell Pass.",
      },
    ],
    links: loaderData
      ? [{ rel: "canonical", href: `/hell-pass/${loaderData.tier.slug}` }]
      : [],
  }),
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
  component: TierDetailPage,
});

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-32 text-center">
        <h1 className="font-display text-3xl font-black uppercase  tracking-tight">
          Тир не найден
        </h1>
        <Link
          to="/hell-pass"
          className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-primary hover:underline"
        >
          ← к списку тиров
        </Link>
      </main>
      <Footer />
    </div>
  );
}

function ErrorPage({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-32 text-center">
        <h1 className="font-display text-2xl font-black uppercase">
          Что-то сломалось
        </h1>
        <p className="mt-3 font-mono text-xs text-muted-foreground">{error.message}</p>
      </main>
      <Footer />
    </div>
  );
}

function TierDetailPage() {
  const { tier } = Route.useLoaderData() as { tier: Tier };
  const isGold = tier.recommended;
  const isPlatinum = tier.ultimate;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-32 md:px-8">
        <Link
          to="/hell-pass"
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
                    / 30 дней
                  </span>
                </div>

                <Link
                  to="/login"
                  search={{ redirect: `/club/hell-pass/${tier.slug}` }}
                  className="mt-6 block w-full px-6 py-3.5 text-center font-display text-sm font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                  style={{
                    background: isGold
                      ? "linear-gradient(135deg, #ffb648 0%, #925f1b 100%)"
                      : isPlatinum
                        ? "var(--primary)"
                        : "#000",
                    color: isGold ? "#000" : "#fff",
                    border: isGold ? "none" : `1px solid ${tier.color}`,
                    boxShadow: isPlatinum
                      ? "0 0 24px color-mix(in oklab, var(--primary) 50%, transparent)"
                      : undefined,
                  }}
                >
                  Войти и оформить
                </Link>

                <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Разовый доступ на 30 дней с момента активации. Без автопродления.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
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
