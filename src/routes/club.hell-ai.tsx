// Hell AI — AI-механик. Узкая полезная фича клуба.
// Редизайн: диагностический «телеметрический» UI вместо обычного чат-окна.
// Слева — приборка по байку и квоте Pass, справа — терминал диалога с
// потоковой печатью ответа, статусом «ONLINE» и сканлайнами.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
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

// ── Тариф юзера (заглушка) ────────────────────────────────────────────────
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

// ── Сообщения ────────────────────────────────────────────────────────────
type Msg = {
  id: string;
  role: "user" | "ai";
  text: string;
  source?: string;
  /** Анимация печати — сколько символов уже показано. */
  typed?: number;
};

const SUGGESTIONS: { icon: typeof Wrench; label: string; prompt: string }[] = [
  { icon: Wrench, label: "Момент затяжки оси", prompt: "Какой момент затяжки передней оси на моём мото?" },
  { icon: Gauge, label: "Давление в шинах", prompt: "Какое давление в шинах для города и для трека?" },
  { icon: Sparkles, label: "Какое масло лить", prompt: "Какое моторное масло рекомендовано и какой интервал замены?" },
  { icon: Lightbulb, label: "Типичные болячки", prompt: "Расскажи про типичные болячки этой модели после 20 000 км." },
  { icon: Zap, label: "Что за стук", prompt: "Лёгкий металлический стук в районе цепи на холодную — что проверить?" },
];

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
      text: `Лёгкий стук на холодную в районе цепи — это чаще всего: 1) провис цепи вне допуска (норма 25–35 мм), 2) направляющая цепи (резиновая), 3) звезда. Если уходит после прогрева — почти всегда цепь. Смажь, отрегулируй натяг.`,
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
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quota = QUOTA_BY_TIER[CURRENT_TIER];
  const isUnlimited = quota === "∞";
  const isGuest = CURRENT_TIER === "guest";
  const left = isUnlimited ? Infinity : (quota as number) - used;
  const canAsk = !isGuest && (isUnlimited || left > 0);

  // Автоскролл
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // Стриминг печати последнего AI-ответа.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "ai") return;
    if (last.typed !== undefined && last.typed >= last.text.length) return;
    const t = setInterval(() => {
      setMessages((m) => {
        const arr = [...m];
        const i = arr.length - 1;
        const cur = arr[i];
        if (!cur || cur.role !== "ai") return m;
        const next = Math.min(cur.text.length, (cur.typed ?? 0) + 3);
        arr[i] = { ...cur, typed: next };
        return arr;
      });
    }, 16);
    return () => clearInterval(t);
  }, [messages]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean || !canAsk || thinking) return;
    const u: Msg = { id: `u${Date.now()}`, role: "user", text: clean };
    setMessages((m) => [...m, u]);
    setInput("");
    setUsed((n) => n + 1);
    setThinking(true);
    setTimeout(() => {
      const ans = mockAnswer(clean, ME.bike);
      setThinking(false);
      setMessages((m) => [
        ...m,
        { id: `a${Date.now()}`, role: "ai", text: ans.text, source: ans.source, typed: 0 },
      ]);
    }, 700);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {/* Шапка с пульсом */}
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          AI-механик · online
        </div>
        <h1 className="font-display text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-foreground md:text-6xl">
          HELL <span className="text-primary">AI</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
          Узкий полезный AI: вопросы по твоему мото. Моменты затяжки, давление, масла,
          болячки модели, диагностика по симптому. Без болтовни — по делу.
        </p>
      </header>

      {/* Грид: телеметрия + терминал */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        {/* Левая колонка — телеметрия */}
        <aside className="flex flex-col gap-3">
          <BikeCard />
          <QuotaCard tier={CURRENT_TIER} used={used} quota={quota} isUnlimited={isUnlimited} />
          <QuickActions onPick={send} disabled={!canAsk || thinking} />
        </aside>

        {/* Правая колонка — терминал */}
        <section className="relative flex min-h-[560px] flex-col overflow-hidden border border-white/[0.08] bg-card/40">
          {/* верхняя плашка терминала */}
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/40 px-4 py-2">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <Activity className="h-3 w-3 text-primary" />
              hell-ai · session
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {thinking ? <span className="text-primary">analyzing…</span> : "ready"}
            </div>
          </div>

          {/* лента сообщений */}
          <div
            ref={scrollRef}
            className="relative flex-1 overflow-y-auto p-4 md:p-6"
            style={{
              maxHeight: "62vh",
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent 0, transparent 31px, color-mix(in oklab, var(--primary) 6%, transparent) 31px, color-mix(in oklab, var(--primary) 6%, transparent) 32px)",
            }}
          >
            {messages.length === 0 ? (
              <EmptyTerminal onPick={send} disabled={!canAsk} />
            ) : (
              <ul className="space-y-5">
                {messages.map((m) => (
                  <li key={m.id}>
                    {m.role === "user" ? <UserLine text={m.text} /> : <AiLine msg={m} />}
                  </li>
                ))}
                {thinking && (
                  <li>
                    <ThinkingLine />
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Композер */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/[0.08] bg-black/60 p-3"
          >
            <span className="pl-1 font-mono text-[12px] text-primary">{">"}</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isGuest
                  ? "Hell AI доступен с Hell Pass"
                  : canAsk
                    ? `спроси про ${ME.bike}…`
                    : "лимит на месяц исчерпан"
              }
              disabled={!canAsk || thinking}
              className="flex-1 bg-transparent px-1 font-mono text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!canAsk || !input.trim() || thinking}
              className="flex h-9 items-center gap-1.5 bg-primary px-3.5 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
              send
            </button>
          </form>
        </section>
      </div>

      <p className="mt-6 max-w-2xl text-[11px] leading-relaxed text-muted-foreground/70">
        Ответы AI — справочные. Для критичных работ (тормоза, подвеска, мотор) сверяйся с
        мануалом и сервисом. Hell AI не ставит диагнозы за тебя — он экономит время на поиск.
      </p>
    </main>
  );
}

// ── Левая колонка ─────────────────────────────────────────────────────────

function BikeCard() {
  return (
    <div className="border border-white/[0.08] bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>твой мото</span>
        <Link to="/club/me" className="text-muted-foreground transition-colors hover:text-primary">
          сменить
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
          <Bike className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {ME.bike}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            контекст активен
          </div>
        </div>
      </div>
    </div>
  );
}

function QuotaCard({
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
            нужен Hell Pass
          </div>
          <div className="truncate text-[13px] text-foreground">
            20 / 100 / ∞ вопросов в месяц →
          </div>
        </div>
      </Link>
    );
  }

  const pct = isUnlimited ? 100 : Math.min(100, (used / (quota as number)) * 100);

  return (
    <div className="border border-white/[0.08] bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>Hell Pass · {TIER_LABEL[tier]}</span>
        <span className="tabular-nums text-foreground">
          {isUnlimited ? "∞" : `${used} / ${quota}`}
        </span>
      </div>
      {/* gauge */}
      <div className="relative h-2 overflow-hidden bg-black/55">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_9px,rgba(0,0,0,0.5)_9px,rgba(0,0,0,0.5)_10px)]" />
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {isUnlimited ? "безлимит" : `осталось ${(quota as number) - used} в этом месяце`}
      </div>
    </div>
  );
}

function QuickActions({
  onPick,
  disabled,
}: {
  onPick: (p: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="border border-white/[0.08] bg-card/40 p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        быстрые вопросы
      </div>
      <ul className="space-y-1.5">
        {SUGGESTIONS.map((s) => (
          <li key={s.label}>
            <button
              onClick={() => onPick(s.prompt)}
              disabled={disabled}
              className="group flex w-full items-center gap-2.5 border border-transparent bg-black/20 px-2.5 py-2 text-left transition-all hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <s.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              <span className="truncate text-[12px] text-foreground">{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Терминал ──────────────────────────────────────────────────────────────

function EmptyTerminal({
  onPick,
  disabled,
}: {
  onPick: (p: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4 font-mono text-[12px] leading-relaxed">
      <div className="text-muted-foreground">
        <span className="text-primary">$</span> hell-ai --init --bike="{ME.bike}"
      </div>
      <div className="text-muted-foreground/80">
        <span className="text-primary">→</span> контекст загружен. сервисные данные модели подключены.
      </div>
      <div className="text-muted-foreground/80">
        <span className="text-primary">→</span> готов к диагностике. задай вопрос или выбери шаблон ниже.
      </div>
      <div className="pt-3">
        <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          // примеры
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <li key={s.label}>
              <button
                onClick={() => onPick(s.prompt)}
                disabled={disabled}
                className="group flex w-full items-start gap-2.5 border border-white/[0.08] bg-black/40 p-3 text-left transition-all hover:-translate-y-px hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <s.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="truncate text-[12px] text-foreground">{s.label}</div>
                  <div className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.prompt}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function UserLine({ text }: { text: string }) {
  return (
    <div className="font-mono text-[13px] leading-relaxed">
      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="h-px w-4 bg-primary" />
        you
      </div>
      <div className="border-l-2 border-primary/60 bg-primary/[0.06] px-3 py-2 text-foreground">
        {text}
      </div>
    </div>
  );
}

function AiLine({ msg }: { msg: Msg }) {
  const shown = msg.text.slice(0, msg.typed ?? msg.text.length);
  const isTyping = (msg.typed ?? msg.text.length) < msg.text.length;
  return (
    <div className="font-mono text-[13px] leading-relaxed">
      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
        <Bot className="h-3 w-3" />
        hell-ai
      </div>
      <div className="border-l-2 border-white/20 bg-black/30 px-3 py-2.5 text-foreground">
        {shown}
        {isTyping && (
          <span className="ml-0.5 inline-block h-3 w-1.5 -translate-y-px animate-pulse bg-primary align-middle" />
        )}
      </div>
      {msg.source && !isTyping && (
        <div className="mt-1.5 pl-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">
          ↳ {msg.source}
        </div>
      )}
    </div>
  );
}

function ThinkingLine() {
  return (
    <div className="font-mono text-[13px]">
      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
        <Bot className="h-3 w-3" />
        hell-ai
      </div>
      <div className="flex items-center gap-1.5 border-l-2 border-primary/40 bg-black/30 px-3 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          анализирую…
        </span>
      </div>
    </div>
  );
}
