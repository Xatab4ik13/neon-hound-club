import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, MessageCircle, Send, Share2, Ticket, Users } from "lucide-react";
import { useState } from "react";
import {
  buildReferralUrl,
  myReferralCode,
  REFERRAL_REWARD_TICKETS,
  useReferrals,
} from "@/data/referral";

export const Route = createFileRoute("/club/invite")({
  head: () => ({
    meta: [
      { title: "Пригласить друга — клуб HELLHOUND" },
      {
        name: "description",
        content: "Зови своих в клуб HELLHOUND и получай билеты.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const friends = useReferrals();
  const url = buildReferralUrl();
  const code = myReferralCode();
  const [copied, setCopied] = useState(false);

  function copy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const shareText = encodeURIComponent(
    `Залетай в клуб HELLHOUND. По моей ссылке — +${REFERRAL_REWARD_TICKETS} билетов на старте.`,
  );
  const shareUrl = encodeURIComponent(url);
  const total = friends.reduce((s, f) => s + f.ticketsRewarded, 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <Link
        to="/club/me"
        className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />В профиль
      </Link>

      <header className="mb-8 border border-white/[0.06] bg-card/40 p-6 md:p-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Реферальная программа
        </div>
        <h1 className="mt-2 font-display text-3xl font-black uppercase italic tracking-tight text-foreground md:text-4xl">
          Пригласи своих
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Поделись ссылкой. Друг регистрируется — обоим прилетает по{" "}
          <span className="font-bold text-foreground">
            {REFERRAL_REWARD_TICKETS} билетов
          </span>
          . Без лимитов. Билеты падают в кошелёк сразу после первой активности друга.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Приведено" value={String(friends.length)} icon={Users} />
          <Stat label="Билетов заработано" value={String(total)} icon={Ticket} />
          <div className="border border-white/[0.06] bg-black/30 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Твой код
            </div>
            <div className="mt-2 font-display text-2xl font-black italic uppercase tracking-tight text-primary">
              {code}
            </div>
          </div>
        </div>
      </header>

      <section className="mb-8 border border-white/[0.06] bg-card/40 p-6">
        <h2 className="mb-3 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
          Твоя ссылка
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 border border-white/[0.08] bg-black/30 px-3 py-2.5 font-mono text-sm">
            <code className="truncate text-foreground">{url}</code>
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center justify-center gap-2 border border-primary bg-primary px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Готово" : "Скопировать"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ShareLink
            href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
            label="Telegram"
            icon={Send}
          />
          <ShareLink
            href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
            label="WhatsApp"
            icon={MessageCircle}
          />
          <ShareLink
            href={`https://vk.com/share.php?url=${shareUrl}`}
            label="VK"
            icon={Share2}
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
            Уже привёл · {friends.length}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            +{total} билетов
          </span>
        </div>

        {friends.length === 0 ? (
          <div className="border border-dashed border-white/[0.08] bg-card/20 p-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Пока никого. Время позвать своих.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04] border border-white/[0.06] bg-card/40">
            {friends.map((f) => (
              <li
                key={f.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-black uppercase italic tracking-wide text-foreground">
                    {f.nick}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    регистрация · {f.joinedAt}
                  </div>
                </div>
                <span
                  className={`whitespace-nowrap border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${
                    f.status === "active"
                      ? "border-green-500/50 text-green-400"
                      : "border-white/[0.1] text-muted-foreground"
                  }`}
                >
                  {f.status === "active" ? "Активен" : "Зарегался"}
                </span>
                <span className="flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-primary">
                  <Ticket className="h-3.5 w-3.5" />+{f.ticketsRewarded}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="border border-white/[0.06] bg-black/30 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
        <span className="font-display text-2xl font-black italic leading-none text-foreground tabular-nums">
          {value}
        </span>
      </div>
    </div>
  );
}

function ShareLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Send;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-2 border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary/60 hover:text-primary"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}
