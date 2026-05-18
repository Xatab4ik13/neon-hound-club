import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";
import { TIERS, type Perk, type Tier } from "@/data/hell-pass";

export const Route = createFileRoute("/hell-pass")({
  head: () => ({
    meta: [
      { title: "Hell Pass — подписка клуба HELLHOUND" },
      {
        name: "description",
        content:
          "Hell Pass — клубная подписка HELLHOUND. Три тира: Silver, Gold, Platinum. Билеты в розыгрыши, AI-механик, скидки на мерч и школу.",
      },
      { property: "og:title", content: "Hell Pass — подписка клуба HELLHOUND" },
      {
        property: "og:description",
        content:
          "Три тира клубной подписки HELLHOUND. Билеты, AI-механик, скидки на мерч и школу.",
      },
      { property: "og:url", content: "/hell-pass" },
    ],
    links: [{ rel: "canonical", href: "/hell-pass" }],
  }),
  component: HellPassPublicPage,
});

function HellPassPublicPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-32 md:px-8">
        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            Подписка клуба
          </p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase italic leading-[0.95] tracking-tighter md:text-6xl">
            HELL <span className="text-primary">PASS</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Три уровня. Билеты в розыгрыши, AI-механик по своему мото, скидки на
            мерч и школу, эксклюзивы. Без пафоса — просто больше клуба.
          </p>
        </section>

        <div className="mt-10 grid grid-cols-1 gap-5 md:gap-6">
          {TIERS.map((tier, i) => (
            <TierCard key={tier.id} tier={tier} index={i} />
          ))}
        </div>

        <section className="mt-16 rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="font-display text-2xl font-black uppercase tracking-tight md:text-3xl">
            Готов в клуб?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Войди или зарегистрируйся — оформление Hell Pass и оплата в личном
            кабинете.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/login">Войти и оформить</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/about">О клубе</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function TierCard({ tier, index }: { tier: Tier; index: number }) {
  const isGold = tier.recommended;
  const isPlatinum = tier.ultimate;

  return (
    <article
      className="group relative flex animate-fade-in flex-col overflow-hidden border border-white/10 bg-[#121212] transition-all duration-300 hover:scale-[1.005] md:flex-row"
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: "backwards",
        borderColor: isGold || isPlatinum ? `${tier.color}33` : undefined,
        boxShadow: isPlatinum ? `0 0 40px -10px ${tier.color}33` : undefined,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 10px, #fff 10px, #fff 11px)",
        }}
      />

      <div className="relative z-10 flex-1 p-6 md:p-8">
        <div className="mb-4 flex items-center gap-3">
          {tier.inheritsFrom && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              Всё из {tier.inheritsFrom} +
            </span>
          )}
          <div className="h-px flex-1 bg-white/10" />
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

        <p className="mb-5 text-sm text-white/70 md:text-base">{tier.tagline}</p>

        <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {tier.perks.map((perk, i) => (
            <PerkRow key={i} perk={perk} tierColor={tier.color} />
          ))}
        </ul>
      </div>

      <div
        className="relative flex w-full items-center justify-center overflow-hidden p-8 md:w-72 md:items-stretch"
        style={{
          background: isGold
            ? "linear-gradient(135deg, #ffb648 0%, #925f1b 100%)"
            : tier.color,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: isPlatinum
              ? "repeating-linear-gradient(90deg, transparent, transparent 2px, black 2px, black 3px)"
              : isGold
                ? "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.12) 4px, rgba(0,0,0,0.12) 8px)"
                : "repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(0,0,0,0.12) 6px, rgba(0,0,0,0.12) 7px)",
          }}
        />
        <div className="relative z-10 flex w-full flex-col items-center justify-between gap-6 py-2 md:py-0">
          <h2 className="font-display text-5xl font-black uppercase italic leading-none tracking-tighter text-black md:text-6xl">
            {tier.name}
          </h2>
          <div className="flex flex-col items-center">
            <div className="font-mono text-3xl font-bold text-black">
              {tier.price.toLocaleString("ru-RU")} ₽
            </div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/60">
              в месяц
            </div>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-[1.04]"
              style={{
                background: isPlatinum ? "var(--primary)" : "#000",
                boxShadow: isPlatinum
                  ? "0 0 20px color-mix(in oklab, var(--primary) 50%, transparent)"
                  : undefined,
              }}
            >
              Оформить →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function PerkRow({ perk, tierColor }: { perk: Perk; tierColor: string }) {
  const Icon = perk.icon;
  return (
    <li className="flex items-start gap-3 text-sm text-white/80">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: tierColor }}
        strokeWidth={2}
      />
      <span className="leading-snug">
        {perk.value && (
          <span
            className="font-mono font-bold text-white"
            style={perk.accent ? { color: tierColor } : undefined}
          >
            {perk.value}
          </span>
        )}
        {perk.value && " "}
        {perk.label}
      </span>
    </li>
  );
}
