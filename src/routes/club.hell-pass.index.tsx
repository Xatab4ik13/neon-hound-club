// Hell Pass — список тиров в Plump-стиле PWA.
// Живёт внутри club-layout. Bento-карточки с большим шилдом тира,
// плампувские иконки и цвета из палитры тира.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlumpArrowRight, PlumpDiamond } from "@/components/ui/icons";
import { PageHeader } from "@/components/club/PageHeader";
import { PlumpNum } from "@/components/brand/PlumpNum";
import { TIERS, type Perk, type Tier } from "@/data/hell-pass";
import { fetchPassMe, qk } from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";

import silverBadge from "@/assets/hellpass/silver.png.asset.json";
import goldBadge from "@/assets/hellpass/gold.png.asset.json";
import platinumBadge from "@/assets/hellpass/platinum.png.asset.json";

const BADGES: Record<Tier["slug"], string> = {
  silver: silverBadge.url,
  gold: goldBadge.url,
  platinum: platinumBadge.url,
};

export const Route = createFileRoute("/club/hell-pass/")({
  head: () => ({
    meta: [
      { title: "Hell Pass — клуб HELLHOUND" },
      {
        name: "description",
        content:
          "Три тира Hell Pass: Silver, Gold, Platinum. Билеты, Hell AI, стикерпаки, VIP-чат.",
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
  const daysLeft = passQ.data?.daysLeft ?? null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+96px)] md:py-8">
      <PageHeader title="Hell Pass" subtitle="Разовый доступ на 30 дней" />

      {active && (
        <ActiveBanner tier={active.tier} daysLeft={daysLeft} />
      )}

      <div className="mt-8 flex flex-col gap-7 px-1 pb-2">
        {TIERS.map((tier, i) => (
          <TierCard key={tier.id} tier={tier} index={i} isActive={active?.tier === tier.slug} />
        ))}
      </div>

      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Оплата разовая. Доступ действует 30 дней с момента оплаты.
      </p>
    </main>
  );
}

function pluralDays(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

// ---------- Active banner ----------

function ActiveBanner({
  tier,
  daysLeft,
}: {
  tier: Tier["slug"];
  daysLeft: number | null;
}) {
  const tierInfo = TIERS.find((t) => t.slug === tier)!;
  return (
    <section
      className="mb-2 flex items-center gap-3 rounded-3xl bg-card px-4 py-3"
      aria-label="Активный Hell Pass"
    >
      <img
        src={BADGES[tier]}
        alt=""
        className="h-12 w-12 shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
      />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Активен
        </div>
        <div
          className="font-display text-lg font-black uppercase leading-tight"
          style={{ color: tierInfo.color }}
        >
          {tierInfo.name}
        </div>
      </div>
      {daysLeft != null && (
        <div className="text-right">
          <div className="text-foreground">
            <PlumpNum value={daysLeft} size={22} />
          </div>
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            {pluralDays(daysLeft)}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- Tier card ----------

function TierCard({
  tier,
  index,
  isActive,
}: {
  tier: Tier;
  index: number;
  isActive: boolean;
}) {
  const featured = tier.perks.slice(0, 4);
  // Лёгкий постоянный «стикерный» наклон, как у карточек инструкторов Школы.
  const tiltDeg = index % 2 === 0 ? -1.2 : 1.2;
  const flyKf = index % 2 === 0 ? "hellpass-fly-in" : "hellpass-fly-in-right";

  return (
    <Link
      to="/club/hell-pass/$tier"
      params={{ tier: tier.slug }}
      className="group relative block overflow-hidden rounded-3xl border-[3px] border-foreground bg-card transition-transform duration-200 ease-out will-change-transform hover:-translate-y-1"
      style={{
        // @ts-expect-error CSS custom property для финального угла наклона
        "--hp-tilt": `${tiltDeg}deg`,
        transform: `rotate(${tiltDeg}deg)`,
        animation: `${flyKf} 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
        animationDelay: `${index * 110}ms`,
        boxShadow: `6px 6px 0 0 hsl(var(--foreground))`,
      }}
    >

      {/* Цветная плашка сверху */}
      <div
        className="relative flex items-center gap-4 px-5 py-4"
        style={{
          background: tier.color,
        }}
      >
        <img
          src={BADGES[tier.slug]}
          alt=""
          className="h-20 w-20 shrink-0 drop-shadow-[0_3px_4px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-3xl font-black uppercase leading-none tracking-tight text-black">
              {tier.name}
            </h2>
            {tier.recommended && (
              <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-black">
                ★ Хит
              </span>
            )}
            {tier.ultimate && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-black px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white">
                <PlumpDiamond className="h-3 w-3" /> VIP
              </span>
            )}
            {isActive && (
              <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-black">
                активен
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-black">
              <PlumpNum value={tier.price} size={26} format />
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/70">
              ₽ / 30 дней
            </span>
          </div>
        </div>
      </div>

      {/* Перки */}
      <div className="px-5 py-4">
        {tier.inheritsFrom && (
          <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Всё из {tier.inheritsFrom} +
          </div>
        )}

        <p className="mb-4 text-sm text-foreground/85">{tier.tagline}</p>

        <ul className="flex flex-col gap-2.5">
          {featured.map((perk, i) => (
            <PerkRow key={i} perk={perk} tierColor={tier.color} />
          ))}
        </ul>

        {tier.perks.length > featured.length && (
          <div className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            + ещё {tier.perks.length - featured.length}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="font-display text-xs font-bold uppercase tracking-widest text-foreground">
            Подробнее и подписаться
          </span>
          <span
            className="grid h-9 w-9 place-items-center rounded-full border-[2px] border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-transform group-hover:translate-x-0.5"
            style={{ background: tier.color }}
          >
            <PlumpArrowRight className="h-4 w-4 text-black" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ---------- Perk row ----------

function PerkRow({ perk, tierColor }: { perk: Perk; tierColor: string }) {
  const Icon = perk.icon;
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border-[2px] border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
        style={{ background: tierColor }}
      >
        <Icon className="h-4 w-4 text-black" />
      </span>
      <span className="flex-1 pt-1 text-sm leading-snug text-foreground">
        {perk.value && (
          <span
            className="font-mono font-bold"
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
