import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ticket,
  Percent,
  Sparkles,
  Zap,
  Frame,
  GraduationCap,
  MessageSquare,
  Vote,
  Trophy,
  ShoppingBag,
  ImagePlus,
  Coins,
  Crown,
  Gift,
  Infinity as InfinityIcon,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/hell-pass")({
  head: () => ({
    meta: [
      { title: "Hell Pass — подписка клуба HELLHOUND" },
      {
        name: "description",
        content:
          "Три тира Hell Pass: Silver, Gold, Platinum. Билеты в розыгрыши, AI-механик, скидки на мерч и школу, эксклюзивы. Без пафоса — просто и по делу.",
      },
      { property: "og:title", content: "Hell Pass — подписка клуба HELLHOUND" },
      {
        property: "og:description",
        content:
          "Silver / Gold / Platinum. Билеты, AI, скидки, эксклюзивы. Сезон каждые 3 месяца.",
      },
    ],
  }),
  component: HellPassPage,
});

// ---------- Data ----------

type Perk = { icon: LucideIcon; label: string; value?: string; accent?: boolean };

const SILVER_PERKS: Perk[] = [
  { icon: Ticket, label: "билета / мес в любые розыгрыши", value: "3" },
  { icon: Percent, label: "скидка на мерч", value: "5%" },
  { icon: Sparkles, label: "AI-вопросов про твой мото / мес", value: "20" },
  { icon: Zap, label: "буст XP клуба", value: "×1.25" },
  { icon: Frame, label: "сезонная рамка профиля", value: "1 базовая" },
  { icon: GraduationCap, label: "скидка на школу HELLHOUND", value: "−20%" },
  { icon: MessageSquare, label: "комментарии в ленте клуба" },
  { icon: Vote, label: "голос за следующее видео", value: "×1" },
  { icon: Trophy, label: "участие в эксклюзивных розыгрышах" },
  { icon: Coins, label: "кешбэк билетами с покупки мерча", value: "1 / 200 ₽" },
];

const GOLD_PERKS: Perk[] = [
  { icon: Ticket, label: "билетов / мес (вместо 3)", value: "10", accent: true },
  { icon: Percent, label: "скидка на мерч", value: "10%", accent: true },
  { icon: Sparkles, label: "AI-вопросов про твой мото / мес", value: "100", accent: true },
  { icon: Zap, label: "буст XP клуба", value: "×1.5", accent: true },
  { icon: Frame, label: "сезонных рамки на выбор", value: "2" },
  { icon: Vote, label: "вес голоса за следующее видео", value: "×2" },
  { icon: Trophy, label: "бонусных билета в месячный эксклюзив", value: "+3", accent: true },
  { icon: ShoppingBag, label: "предзаказ мерча до общего старта", accent: true },
];

const PLATINUM_PERKS: Perk[] = [
  { icon: Ticket, label: "билетов / мес (вместо 10)", value: "25", accent: true },
  { icon: Percent, label: "скидка на мерч", value: "15%", accent: true },
  { icon: InfinityIcon, label: "AI-вопросов — безлимит", value: "∞", accent: true },
  { icon: ImagePlus, label: "AI-генераций картинок / мес", value: "20", accent: true },
  { icon: Zap, label: "буст XP клуба", value: "×2.0", accent: true },
  { icon: Crown, label: "все сезонные рамки + анимированная Platinum-рамка" },
  { icon: Vote, label: "вес голоса за следующее видео", value: "×5" },
  { icon: Trophy, label: "бонусных билета в месячный эксклюзив", value: "+10", accent: true },
  { icon: Sparkles, label: "закрытый Platinum-розыгрыш раз в сезон", accent: true },
  { icon: Gift, label: "лимитированный мерч в подарок", value: "1 / сезон", accent: true },
];

type Tier = {
  id: string;
  name: string;
  price: number;
  badge?: string;
  color: string; // hex
  perks: Perk[];
  inheritsFrom?: string;
  cta: string;
  recommended?: boolean;
  ultimate?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "PASS-01-SILVER",
    name: "Silver",
    price: 490,
    color: "#b8a48a",
    perks: SILVER_PERKS,
    cta: "Выбрать Silver",
  },
  {
    id: "PASS-02-GOLD",
    name: "Gold",
    price: 1290,
    color: "#ffb648",
    perks: GOLD_PERKS,
    inheritsFrom: "Silver",
    cta: "Войти в клуб",
    recommended: true,
  },
  {
    id: "PASS-03-PLATINUM",
    name: "Platinum",
    price: 2990,
    color: "#e8e4d6",
    perks: PLATINUM_PERKS,
    inheritsFrom: "Gold",
    cta: "Стать Platinum",
    ultimate: true,
  },
];

// ---------- Page ----------

function HellPassPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Diagonal hatch background (same language as /club) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 22px)",
        }}
      />

      <Header />

      <main className="relative mx-auto w-full max-w-6xl px-4 py-10 md:px-8 md:py-16">
        <Hero />

        <div className="mt-12 grid grid-cols-1 gap-6 md:gap-8">
          {TIERS.map((tier, i) => (
            <TierCard key={tier.id} tier={tier} index={i} />
          ))}
        </div>

        <TicketsExplainer />
        <SeasonNote />
        <FAQ />
      </main>
    </div>
  );
}

// ---------- Header ----------

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="block" aria-label="HELLHOUND home">
          <span
            className="font-display text-2xl font-black tracking-tight text-foreground"
            style={{
              textShadow: "0 0 8px color-mix(in oklab, var(--primary) 25%, transparent)",
            }}
          >
            HELL<span className="italic text-primary">HOUND</span>
          </span>
        </Link>
        <Link
          to="/club"
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          Личный кабинет →
        </Link>
      </div>
    </header>
  );
}

// ---------- Hero ----------

function Hero() {
  return (
    <section className="relative">
      <div
        className="inline-block px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary"
        style={{ border: "1px solid color-mix(in oklab, var(--primary) 40%, transparent)" }}
      >
        ID: HELL-PASS / S01
      </div>
      <h1 className="mt-4 font-display text-5xl font-black uppercase italic leading-[0.95] tracking-tighter text-foreground md:text-7xl">
        HELL <span className="text-primary">PASS</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
        Подписка клуба HELLHOUND. Три уровня. Билеты в розыгрыши, AI-механик по
        твоему мото, скидки на мерч и школу, эксклюзивы. Без пафоса — просто
        больше клуба.
      </p>
    </section>
  );
}

// ---------- Tier Card (horizontal dossier) ----------

function TierCard({ tier, index }: { tier: Tier; index: number }) {
  const isGold = tier.recommended;
  const isPlatinum = tier.ultimate;

  return (
    <article
      className="group relative flex animate-fade-in flex-col overflow-hidden border border-white/10 bg-[#121212] transition-all duration-300 hover:scale-[1.01] md:flex-row"
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: "backwards",
        borderColor: isGold || isPlatinum ? `${tier.color}33` : undefined,
        boxShadow: isPlatinum
          ? `0 0 40px -10px ${tier.color}33`
          : undefined,
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

      {/* LEFT: benefits */}
      <div className="relative z-10 flex-1 p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span
            className="px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest"
            style={{
              background: isPlatinum ? tier.color : "#000",
              color: isPlatinum ? "#000" : tier.color,
              border: `1px solid ${tier.color}66`,
            }}
          >
            ID: {tier.id}
          </span>
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

        <ul className="grid grid-cols-1 gap-y-3 gap-x-6 sm:grid-cols-2">
          {tier.perks.map((perk, i) => (
            <PerkRow key={i} perk={perk} tierColor={tier.color} />
          ))}
        </ul>
      </div>

      {/* RIGHT: identity slab */}
      <div
        className="relative flex w-full items-center justify-center overflow-hidden p-8 md:w-72 md:items-stretch"
        style={{
          background: isGold
            ? "linear-gradient(135deg, #ffb648 0%, #925f1b 100%)"
            : tier.color,
          clipPath:
            "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        }}
      >
        {/* slant on desktop */}
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
        {/* texture */}
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
          <h2
            className="font-display text-5xl font-black uppercase italic leading-none tracking-tighter text-black md:text-6xl"
          >
            {tier.name}
          </h2>
          <div className="flex flex-col items-center">
            <div className="font-mono text-3xl font-bold text-black">
              {tier.price.toLocaleString("ru-RU")} ₽
            </div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/60">
              в месяц
            </div>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-[1.04]"
              style={{
                background: isPlatinum ? "var(--primary)" : "#000",
                clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)",
                boxShadow: isPlatinum
                  ? "0 0 20px color-mix(in oklab, var(--primary) 50%, transparent)"
                  : undefined,
              }}
            >
              {tier.cta} →
            </button>
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

// ---------- Tickets explainer ----------

function TicketsExplainer() {
  const sources = [
    { icon: Crown, label: "Подписка Hell Pass", note: "3 / 10 / 25 в мес по тиру" },
    { icon: Zap, label: "Активность в клубе", note: "XP-цели, голосование, комменты" },
    { icon: ShoppingBag, label: "Кешбэк с мерча", note: "1 билет за каждые 200 ₽" },
    { icon: Coins, label: "Прямая покупка", note: "от 1 / 300 ₽ до 50 / 3 000 ₽" },
  ];
  return (
    <section className="mt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div
            className="inline-block px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary"
            style={{
              border: "1px solid color-mix(in oklab, var(--primary) 40%, transparent)",
            }}
          >
            ID: TICKETS / CURRENCY
          </div>
          <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-foreground md:text-4xl">
            Билеты — это валюта клуба
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            1 билет = 1 участие в 1 розыгрыше. Копятся, не сгорают. Тратятся
            на любой текущий розыгрыш — мерч, гир, мотоцикл.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sources.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="relative border border-white/10 bg-[#121212] p-5 transition-colors hover:border-primary/40"
            >
              <Icon className="h-5 w-5 text-primary" strokeWidth={2} />
              <div className="mt-3 font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {s.label}
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {s.note}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------- Season note ----------

function SeasonNote() {
  return (
    <section className="mt-12 border border-white/10 bg-[#0f0f0f] p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div
            className="inline-block px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary"
            style={{
              border: "1px solid color-mix(in oklab, var(--primary) 40%, transparent)",
            }}
          >
            ID: SEASON / 03-MONTH CYCLE
          </div>
          <h3 className="mt-2 font-display text-2xl font-black uppercase italic tracking-tighter text-foreground">
            Сезон — каждые 3 месяца
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Сезонные рамки и значки обнуляются. Старые остаются в коллекции, но
            не как «текущий сезон» — это делает их редкими. Закрытый Platinum-розыгрыш
            и сезонный мерч-подарок — раз в сезон.
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------- FAQ ----------

function FAQ() {
  const items = [
    {
      q: "Когда отменю — что будет с билетами?",
      a: "Купленные и накопленные билеты остаются на аккаунте навсегда. Сгорает только дроп Pass за следующие месяцы.",
    },
    {
      q: "Можно купить билеты без подписки?",
      a: "Да. Пакеты: 1 / 300 ₽, 3 / 500 ₽, 5 / 700 ₽, 10 / 1 000 ₽, 20 / 1 500 ₽, 50 / 3 000 ₽. Подписка просто выгоднее на дистанции.",
    },
    {
      q: "Билеты Pass можно тратить на розыгрыш мотоцикла?",
      a: "Да, билет — единая валюта. Никаких ограничений по типу розыгрыша.",
    },
    {
      q: "AI-механик — это что?",
      a: "Текстовый чат, который отвечает на вопросы по твоему конкретному мото (марка, год, объём). Регламенты, мануалы, типовые поломки. Не заменяет сервис, но отвечает быстрее форума.",
    },
    {
      q: "Можно ли менять тир?",
      a: "Да, в любой момент. При апгрейде новые лимиты применяются сразу.",
    },
  ];
  return (
    <section className="mt-16">
      <div
        className="inline-block px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary"
        style={{
          border: "1px solid color-mix(in oklab, var(--primary) 40%, transparent)",
        }}
      >
        ID: FAQ
      </div>
      <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tighter text-foreground md:text-4xl">
        Вопросы
      </h2>
      <ul className="mt-6 divide-y divide-white/10 border border-white/10 bg-[#0f0f0f]">
        {items.map((it, i) => (
          <li key={i} className="p-5 md:p-6">
            <div className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              {it.q}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{it.a}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
