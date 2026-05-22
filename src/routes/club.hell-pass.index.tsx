// Hell Pass — список тиров. Живёт внутри club-layout (с левым меню).
// На странице: hero + бейдж активного пасса + 3 карточки тиров.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TIERS, type Perk, type Tier } from "@/data/hell-pass";
import { fetchPassMe, qk } from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";

export const Route = createFileRoute("/club/hell-pass/")({
  head: () => ({
    meta: [
      { title: "Hell Pass — клуб HELLHOUND" },
      {
        name: "description",
        content:
          "Три тира Hell Pass: Silver, Gold, Platinum. Билеты, AI-механик, скидки, эксклюзивы.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HellPassPage,
});

function HellPassPage() {
  const { isAuthed } = useViewer();
  const passQ = useQuery({
    queryKey: qk.passMe,
    queryFn: fetchPassMe,
    enabled: isAuthed,
  });
  const active = passQ.data?.active ?? null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <Hero />

      {active && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-primary/30 bg-primary/[0.05] px-4 py-3">
          <div className="font-mono text-[11px] uppercase tracking-widest text-foreground">
            Активен: <span className="text-primary">{active.tier.toUpperCase()}</span>
            {active.expiresAt && (
              <span className="ml-2 text-muted-foreground">
                до {new Date(active.expiresAt).toLocaleDateString("ru-RU")}
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Можно купить ещё один — продлит срок
          </span>
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 gap-5 md:gap-6">
        {TIERS.map((tier, i) => (
          <TierCard key={tier.id} tier={tier} index={i} />
        ))}
      </div>
    </main>
  );
}

// ---------- Hero ----------

function Hero() {
  return (
    <section className="relative">
      <h1 className="font-display text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-foreground md:text-6xl">
        HELL <span className="text-primary">PASS</span>
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
        Подписка клуба HELLHOUND. Три уровня. Билеты в розыгрыши, AI-механик,
        скидки на мерч и школу, эксклюзивы. Без пафоса — просто больше клуба.
      </p>
    </section>
  );
}

// ---------- Tier Card ----------

function TierCard({ tier, index }: { tier: Tier; index: number }) {
  const isGold = tier.recommended;
  const isPlatinum = tier.ultimate;

  // На карточке — 4 ключевых перка, не весь список.
  const featured = tier.perks.slice(0, 4);

  return (
    <article
      className="group relative flex animate-fade-in flex-col overflow-hidden border border-white/10 bg-[#121212] transition-all duration-300 hover:scale-[1.01] md:flex-row"
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: "backwards",
        borderColor: isGold || isPlatinum ? `${tier.color}33` : undefined,
        boxShadow: isPlatinum ? `0 0 40px -10px ${tier.color}33` : undefined,
      }}
    >
      {/* hatch */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 10px, #fff 10px, #fff 11px)",
        }}
      />

      {/* Gold shimmer on hover */}
      {isGold && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-transparent via-[#ffb648]/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
        />
      )}

      {/* LEFT: краткое инфо */}
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
              className="animate-pulse font-mono text-[10px] font-bold italic uppercase tracking-widest"
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

        <ul className="grid grid-cols-1 gap-y-2.5 gap-x-6 sm:grid-cols-2">
          {featured.map((perk, i) => (
            <PerkRow key={i} perk={perk} tierColor={tier.color} />
          ))}
        </ul>

        {tier.perks.length > featured.length && (
          <div className="mt-4 font-mono text-[11px] uppercase tracking-widest text-white/40">
            + ещё {tier.perks.length - featured.length} преимуществ
          </div>
        )}
      </div>

      {/* RIGHT: identity slab */}
      <div
        className="relative flex w-full items-center justify-center overflow-hidden p-8 md:w-72 md:items-stretch"
        style={{
          background: isGold
            ? "linear-gradient(135deg, #ffb648 0%, #925f1b 100%)"
            : tier.color,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 hidden md:block"
          style={{
            background: isGold
              ? "linear-gradient(135deg, #ffb648 0%, #925f1b 100%)"
              : tier.color,
            clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0 100%)",
          }}
        />
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
              to="/club/hell-pass/$tier"
              params={{ tier: tier.slug }}
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-[1.04]"
              style={{
                background: isPlatinum ? "var(--primary)" : "#000",
                clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)",
                boxShadow: isPlatinum
                  ? "0 0 20px color-mix(in oklab, var(--primary) 50%, transparent)"
                  : undefined,
              }}
            >
              Подробнее →
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
