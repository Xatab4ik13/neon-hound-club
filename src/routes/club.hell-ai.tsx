// Hell AI — AI-механик. Узкая полезная фича клуба:
// чат с привязкой к байку пользователя из профиля. Без генерации картинок,
// без «AI-чата с Hell» — только техническая помощь по мото.
//
// На этом этапе — рабочий UI с мок-ответами. Подключение к Lovable AI Gateway
// (модель `google/gemini-3-flash-preview`) — отдельной задачей.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bike,
  Bot,
  Gauge,
  Lightbulb,
  Lock,
  Send,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { ME } from "@/data/profile";

export const Route = createFileRoute("/club/hell-ai")({
  head: () => ({
    meta: [
      { title: "Hell AI — AI-механик клуба HELLHOUND" },
      {
        name: "description",
        content:
          "AI-механик: задавай вопросы по своему мото. Моменты затяжки, масла, типичные болячки модели, давление.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HellAiPage,
});

// ── Тариф юзера (заглушка). Берётся из Pass-стейта, пока — статика. ──────
// silver → 20, gold → 100, platinum → ∞. Гость без Pass — 0.
type PassTier = "guest" | "silver" | "gold" | "platinum";
const CURRENT_TIER: PassTier = "gold";
const QUOTA_BY_TIER: Record<PassTier, number | "∞"> = {
  guest: 0,
  silver: 20,
  gold: 100,
  platinum: "∞",
};
const TIER_LABEL: Record<PassTier, string> = {
  guest: "Без Hell Pass",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

// ── Сообщения ──────────────────────────────────────────────────────────────
type Msg = {
  id: string;
  role: "user" | "ai";
  text: string;
  /** Для AI-ответа — короткий «источник», чтобы было видно что это не угадайка. */
  source?: string;
};

const SUGGESTIONS: { icon: typeof Wrench; label: string; prompt: string }[] = [
  {
    icon: Wrench,
    label: "Момент затяжки оси",
    prompt: "Какой момент затяжки передней оси на моём мото?",
  },
  {
    icon: Gauge,
    label: "Давление в шинах",
    prompt: "Какое давление в шинах для города и для трека?",
  },
  {
    icon: Sparkles,
    label: "Какое масло лить",
    prompt: "Какое моторное масло рекомендовано и какой интервал замены?",
  },
  {
    icon: Lightbulb,
    label: "Типичные болячки",
    prompt: "Расскажи про типичные болячки этой модели после 20 000 км.",
  },
  {
    icon: Zap,
    label: "Что за стук",
    prompt: "Лёгкий металлический стук в районе цепи на холодную — что проверить?",
  },
];

// Простой мок: отвечаем шаблонами с привязкой к байку из профиля.
function mockAnswer(prompt: string, bike: string): { text: string; source: string } {
  const lower = prompt.toLowerCase();
  if (lower.includes("ось") || lower.includes("затяж")) {
    return {
      text: `Для ${bike}: гайка передней оси — 91 Н·м, стяжные болты пера вилки — 23 Н·м. Затягивай в два прохода крест-накрест, перед затяжкой прокачай вилку.`,
      source: "Service manual · моменты затяжки",
    };
  }
  if (lower.includes("давлен")) {
    return {
      text: `${bike}, заводская рекомендация: перед 2.25 / зад 2.50 бар (соло). Для трека на спортивной резине — 2.1 / 2.0 бар (горячее). Проверяй на холодных шинах.`,
      source: "Owner's manual · разд. шины",
    };
  }
  if (lower.includes("масл")) {
    return {
      text: `${bike}: 10W-40 JASO MA2, объём при замене с фильтром — 3.4 л. Интервал — каждые 6 000 км или раз в год. Yamalube 10W-40 или Motul 7100 4T — рабочие варианты.`,
      source: "Service manual · ТО",
    };
  }
  if (lower.includes("боляч") || lower.includes("проблем")) {
    return {
      text: `${bike}, частые точки внимания после 20 000 км: подшипники рулевой колонки (люфт на малых скоростях), задний амортизатор (садится), катушки зажигания на старых модификациях, окисление контактов под седлом. Ничего фатального, но проверить стоит.`,
      source: "Опыт владельцев · форумы и сервисы",
    };
  }
  if (lower.includes("стук") || lower.includes("шум")) {
    return {
      text: `Лёгкий стук на холодную в районе цепи — это чаще всего: 1) провис цепи вне допуска (проверь по метке — норма 25–35 мм), 2) направляющая цепи (резиновая), 3) звезда. Если уходит после прогрева — почти всегда цепь. Смажь, отрегулируй натяг.`,
      source: "Диагностика по симптому",
    };
  }
  return {
    text: `По ${bike}: дай чуть больше деталей — пробег, на холодную/горячую, симптом постоянный или эпизодический. Так отвечу точнее. (Это демо-ответ — модель подключим следующим шагом.)`,
    source: "AI-механик · уточнение",
  };
}

function HellAiPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [used, setUsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quota = QUOTA_BY_TIER[CURRENT_TIER];
  const isUnlimited = quota === "∞";
  const isGuest = CURRENT_TIER === "guest";
  const left = isUnlimited ? Infinity : (quota as number) - used;
  const canAsk = !isGuest && (isUnlimited || left > 0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean || !canAsk) return;
    const u: Msg = { id: `u${Date.now()}`, role: "user", text: clean };
    setMessages((m) => [...m, u]);
    setInput("");
    setUsed((n) => n + 1);
    // Лёгкая задержка, чтобы было ощущение «думает».
    setTimeout(() => {
      const ans = mockAnswer(clean, ME.bike);
      setMessages((m) => [
        ...m,
        { id: `a${Date.now()}`, role: "ai", text: ans.text, source: ans.source },
      ]);
    }, 350);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 md:px-8 md:py-10">
      {/* Шапка */}
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <Bot className="h-3 w-3 text-primary" />
          AI-механик клуба
        </div>
        <h1 className="font-display text-3xl font-black uppercase italic leading-[0.95] tracking-tighter text-foreground md:text-5xl">
          HELL <span className="text-primary">AI</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
          Узкий полезный AI: вопросы по твоему мото. Моменты затяжки, давление, масла,
          болячки модели, диагностика по симптому. Без болтовни — по делу.
        </p>
      </header>

      {/* Байк + квота */}
      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BikePanel />
        <QuotaPanel
          tier={CURRENT_TIER}
          used={used}
          quota={quota}
          isUnlimited={isUnlimited}
        />
      </section>

      {/* Чат */}
      <section className="flex min-h-[420px] flex-col border border-white/[0.06] bg-card/40">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-5"
          style={{ maxHeight: "55vh" }}
        >
          {messages.length === 0 ? (
            <EmptyState onPick={send} disabled={!canAsk} />
          ) : (
            <ul className="space-y-4">
              {messages.map((m) => (
                <li key={m.id}>
                  {m.role === "user" ? <UserBubble text={m.text} /> : <AiBubble msg={m} />}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Композер */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-white/[0.06] bg-black/40 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isGuest
                ? "Hell AI доступен с Hell Pass"
                : canAsk
                  ? `Спроси про ${ME.bike}…`
                  : "Лимит на месяц исчерпан"
            }
            disabled={!canAsk}
            className="flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!canAsk || !input.trim()}
            className="flex h-9 items-center gap-1.5 bg-primary px-3 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5" />
            Спросить
          </button>
        </form>
      </section>

      {/* Подсказки под чатом */}
      {messages.length > 0 && canAsk && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.slice(0, 3).map((s) => (
            <button
              key={s.label}
              onClick={() => send(s.prompt)}
              className="flex items-center gap-1.5 border border-white/[0.08] bg-card/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <s.icon className="h-3 w-3" />
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Мелкий disclaimer */}
      <p className="mt-6 max-w-2xl text-[11px] leading-relaxed text-muted-foreground/70">
        Ответы AI — справочные. Для критичных работ (тормоза, подвеска, мотор) сверяйся с
        мануалом и сервисом. Hell AI не ставит диагнозы за тебя — он экономит время на поиск.
      </p>
    </main>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function BikePanel() {
  return (
    <div className="flex items-center gap-3 border border-white/[0.06] bg-card/40 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
        <Bike className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Твой мото
        </div>
        <div className="truncate text-[15px] font-semibold text-foreground">{ME.bike}</div>
      </div>
      <Link
        to="/club/me"
        className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
      >
        сменить
      </Link>
    </div>
  );
}

function QuotaPanel({
  tier,
  used,
  quota,
  isUnlimited,
}: {
  tier: PassTier;
  used: number;
  quota: number | "∞";
  isUnlimited: boolean;
}) {
  const isGuest = tier === "guest";
  const pct = isUnlimited || isGuest ? 0 : Math.min(100, (used / (quota as number)) * 100);

  if (isGuest) {
    return (
      <Link
        to="/club/hell-pass"
        className="group flex items-center gap-3 border border-primary/40 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-primary/40 bg-primary/20 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Нужен Hell Pass
          </div>
          <div className="truncate text-[13px] text-foreground">
            Открой 20 / 100 / ∞ вопросов в месяц →
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 border border-white/[0.06] bg-card/40 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Hell Pass · {TIER_LABEL[tier]}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-foreground">
            {isUnlimited ? "∞" : `${used} / ${quota}`}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden bg-black/55">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: isUnlimited ? "100%" : `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-foreground">
            Привет. Я AI-механик.
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            знаю твой {ME.bike}
          </div>
        </div>
      </div>

      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        с чего начать
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <li key={s.label}>
            <button
              onClick={() => onPick(s.prompt)}
              disabled={disabled}
              className="group flex w-full items-center gap-3 border border-white/[0.06] bg-black/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/[0.08] text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                <s.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-foreground">{s.label}</div>
                <div className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.prompt}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-[14px] text-foreground">
        {text}
      </div>
    </div>
  );
}

function AiBubble({ msg }: { msg: Msg }) {
  return (
    <div className="flex max-w-[92%] gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="border border-white/[0.06] bg-black/30 px-3.5 py-2.5 text-[14px] leading-relaxed text-foreground">
          {msg.text}
        </div>
        {msg.source && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            ↳ {msg.source}
          </div>
        )}
      </div>
    </div>
  );
}
