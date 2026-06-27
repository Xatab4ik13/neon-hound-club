import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  MessageCircle,
  Send,
  Share2,
  Ticket,
  Users,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/club/PageHeader";
import {
  buildReferralUrl,
  REFERRAL_REWARD_TICKETS,
  useInvitesMe,
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
  const { data } = useInvitesMe();
  const friends = data?.items ?? [];
  const code = data?.code ?? "";
  const url = code ? buildReferralUrl(code) : "";
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!url || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const shareText = encodeURIComponent(
    `Залетай в клуб HELLHOUND. По моей ссылке — +${REFERRAL_REWARD_TICKETS} билет на старте.`,
  );
  const shareUrl = encodeURIComponent(url);
  const total = data?.totals.tickets ?? 0;

  async function nativeShare() {
    if (typeof navigator === "undefined" || !navigator.share) {
      copy();
      return;
    }
    try {
      await navigator.share({
        title: "Клуб HELLHOUND",
        text: `+${REFERRAL_REWARD_TICKETS} билет на старте по моей ссылке.`,
        url,
      });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8"
      style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
    >
      <PageHeader title="Пригласить" subtitle="Реферальная программа клуба" />

      {/* Reward hero card */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card/60 to-black px-5 py-6">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          <Ticket className="h-3.5 w-3.5" />
          Бонус обоим
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-5xl font-black italic leading-none tabular-nums text-foreground">
            +{REFERRAL_REWARD_TICKETS}
          </span>
          <span className="font-mono text-[13px] uppercase tracking-wider text-muted-foreground">
            билет
          </span>
        </div>
        <p className="mt-3 text-[14px] leading-snug text-muted-foreground">
          Друг регистрируется по твоей ссылке — обоим прилетает по{" "}
          <span className="font-semibold text-foreground">1 билету</span> после
          первой активности. Без лимитов.
        </p>
      </section>

      {/* Stats: 3 iOS tiles */}
      <section className="mb-5 grid grid-cols-3 gap-2">
        <StatTile
          icon={<Users className="h-4 w-4" />}
          label="Приведено"
          value={friends.length}
        />
        <StatTile
          icon={<Ticket className="h-4 w-4" />}
          label="Билетов"
          value={total}
        />
        <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-3 py-3">
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Мой код
          </div>
          <div className="mt-1 truncate font-display text-[18px] font-black italic uppercase tracking-tight text-primary">
            {code}
          </div>
        </div>
      </section>

      {/* Link + copy + share */}
      <section className="mb-5 rounded-2xl border border-white/[0.06] bg-card/40 p-3">
        <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2.5">
          <code className="flex-1 truncate font-mono text-[12px] text-foreground">
            {url}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label="Скопировать ссылку"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary active:scale-95"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <button
          type="button"
          onClick={nativeShare}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-[14px] font-black uppercase italic tracking-wider text-primary-foreground active:scale-[0.98]"
        >
          <Share2 className="h-4 w-4" />
          Поделиться
        </button>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <ShareTile
            href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
            label="Telegram"
            icon={<Send className="h-4 w-4" />}
          />
          <ShareTile
            href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
            label="WhatsApp"
            icon={<MessageCircle className="h-4 w-4" />}
          />
          <ShareTile
            href={`https://vk.com/share.php?url=${shareUrl}`}
            label="VK"
            icon={<Share2 className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mb-5">
        <h3 className="mb-1.5 px-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Как это работает
        </h3>
        <ol className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
          <Step n={1} text="Поделись ссылкой со своими." />
          <Step n={2} text="Друг регистрируется в клубе и подтверждает email." />
          <Step
            n={3}
            text={`После первой активности друга оба получаете +${REFERRAL_REWARD_TICKETS} билет.`}
          />
        </ol>
      </section>

      {/* Friends list */}
      <section>
        <div className="mb-1.5 flex items-end justify-between px-3">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Приведено · {friends.length}
          </h3>
          {total > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
              +{total} {total === 1 ? "билет" : total < 5 ? "билета" : "билетов"}
            </span>
          )}
        </div>

        {friends.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-card/30 px-6 py-10 text-center">
            <Users className="h-6 w-6 text-muted-foreground/60" />
            <p className="mt-3 max-w-[26ch] text-[13px] text-muted-foreground">
              Пока никого. Кинь ссылку в чат — приведи своих.
            </p>
          </div>
        ) : (
          <>
            <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
              {friends.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-[13px] font-black italic text-primary">
                    {f.nick.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-foreground">
                      {f.nick}
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {f.joinedAt.slice(0, 10)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                      f.status === "active"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-400/30 bg-amber-400/[0.06] text-amber-300"
                    }`}
                    title={
                      f.status === "active"
                        ? "Билет начислен"
                        : "Ждём, пока друг добавит телефон в профиль"
                    }
                  >
                    {f.status === "active" ? "Активен" : "Без телефона"}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 font-mono text-[13px] font-bold tabular-nums text-primary">
                    <Ticket className="h-3.5 w-3.5" />+{f.ticketsRewarded}
                  </span>
                </li>
              ))}
            </ul>
            {friends.some((f) => f.status !== "active") && (
              <p className="mt-3 px-1 text-[12px] leading-relaxed text-muted-foreground">
                Билеты падают обоим только когда друг добавит телефон в профиль — это защита от
                фейковых аккаунтов. Напомни ему открыть{" "}
                <span className="font-mono text-foreground">«Профиль»</span> и заполнить номер.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-3 py-3">
      <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-black italic leading-none tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function ShareTile({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 text-foreground active:scale-95"
    >
      <span className="text-primary">{icon}</span>
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </a>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[11px] font-bold text-primary">
        {n}
      </span>
      <span className="text-[14px] text-foreground/85">{text}</span>
    </li>
  );
}
