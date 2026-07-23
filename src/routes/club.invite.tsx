import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  MessageCircle,
  Send,
  Share2,
  PlumpTicket,
  PlumpUsers as Users,
} from "@/components/ui/icons";
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

// Фирменные Plump-цвета
const C_PINK = "#F000C0";
const C_SALAD = "#B6FF3C";
const C_CYAN = "#3DDBD9";
const C_YELLOW = "#FFD93D";
const C_ORANGE = "#FF7A3D";

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

      {/* Reward hero — розовая Plump-плашка */}
      <section
        className="relative mb-6 overflow-hidden rounded-2xl border-[2px] border-foreground px-5 py-6 shadow-[4px_4px_0_0_hsl(var(--foreground))]"
        style={{ background: C_PINK }}
      >
        <div className="flex items-center gap-1.5 font-display text-[11px] font-black uppercase italic tracking-wider text-black">
          <PlumpTicket className="h-3.5 w-3.5" />
          Бонус обоим
        </div>
        <div className="mt-2 flex items-baseline gap-2 text-black">
          <span className="font-display text-6xl font-black italic leading-none tabular-nums">
            +{REFERRAL_REWARD_TICKETS}
          </span>
          <span className="font-display text-[14px] font-black uppercase italic tracking-wider">
            билет
          </span>
        </div>
        <p className="mt-3 text-[13px] font-medium leading-snug text-black/85">
          Друг регистрируется по твоей ссылке — обоим прилетает по{" "}
          <span className="font-black">1 билету</span> после первой активности. Без лимитов.
        </p>
      </section>

      {/* Stats: 3 разноцветных Plump-плитки */}
      <section className="mb-6 grid grid-cols-3 gap-2.5">
        <PlumpTile color={C_SALAD} icon={<Users className="h-4 w-4" />} label="Приведено" value={friends.length} />
        <PlumpTile color={C_YELLOW} icon={<PlumpTicket className="h-4 w-4" />} label="Билетов" value={total} />
        <div
          className="rounded-2xl border-[2px] border-foreground px-3 py-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]"
          style={{ background: C_CYAN }}
        >
          <div className="font-display text-[10px] font-black uppercase italic tracking-wider text-black">
            Мой код
          </div>
          <div className="mt-1 truncate font-display text-[18px] font-black italic uppercase tracking-tight text-black">
            {code || "—"}
          </div>
        </div>
      </section>

      {/* Link + copy + share */}
      <section className="mb-6 rounded-2xl border-[2px] border-foreground bg-card p-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]">
        <div className="flex items-center gap-2 rounded-xl border-[2px] border-foreground bg-black/40 px-3 py-2.5">
          <code className="flex-1 truncate font-mono text-[12px] text-foreground">
            {url}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label="Скопировать ссылку"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-[2px] border-foreground text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            style={{ background: copied ? C_SALAD : C_YELLOW }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <button
          type="button"
          onClick={nativeShare}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-foreground py-3 font-display text-[14px] font-black uppercase italic tracking-wider text-black shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          style={{ background: C_PINK }}
        >
          <Share2 className="h-4 w-4" />
          Поделиться
        </button>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <ShareTile
            color={C_CYAN}
            href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
            label="Telegram"
            icon={<Send className="h-4 w-4" />}
          />
          <ShareTile
            color={C_SALAD}
            href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
            label="WhatsApp"
            icon={<MessageCircle className="h-4 w-4" />}
          />
          <ShareTile
            color={C_ORANGE}
            href={`https://vk.com/share.php?url=${shareUrl}`}
            label="VK"
            icon={<Share2 className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mb-6">
        <h3 className="mb-2 px-1 font-display text-[13px] font-black uppercase italic tracking-wider text-foreground">
          Как это работает
        </h3>
        <ol className="space-y-2">
          <Step n={1} color={C_SALAD} text="Поделись ссылкой со своими." />
          <Step n={2} color={C_CYAN} text="Друг регистрируется в клубе и подтверждает email." />
          <Step
            n={3}
            color={C_YELLOW}
            text={`После первой активности друга оба получаете +${REFERRAL_REWARD_TICKETS} билет.`}
          />
        </ol>
      </section>

      {/* Friends list */}
      <section>
        <div className="mb-2 flex items-end justify-between px-1">
          <h3 className="font-display text-[13px] font-black uppercase italic tracking-wider text-foreground">
            Приведено · {friends.length}
          </h3>
          {total > 0 && (
            <span
              className="rounded-md border-[2px] border-foreground px-2 py-0.5 font-display text-[11px] font-black uppercase italic tracking-wider text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              style={{ background: C_YELLOW }}
            >
              +{total} {total === 1 ? "билет" : total < 5 ? "билета" : "билетов"}
            </span>
          )}
        </div>

        {friends.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border-[2px] border-dashed border-foreground/40 bg-card/40 px-6 py-10 text-center">
            <Users className="h-6 w-6 text-muted-foreground/60" />
            <p className="mt-3 max-w-[26ch] text-[13px] text-muted-foreground">
              Пока никого. Кинь ссылку в чат — приведи своих.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {friends.map((f, i) => {
                const avatarColor = [C_PINK, C_SALAD, C_CYAN, C_YELLOW, C_ORANGE][i % 5];
                const active = f.status === "active";
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 rounded-2xl border-[2px] border-foreground bg-card px-3 py-2.5 shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                  >
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[2px] border-foreground font-display text-[13px] font-black italic text-black"
                      style={{ background: avatarColor }}
                    >
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
                      className="shrink-0 rounded-md border-[2px] border-foreground px-1.5 py-0.5 font-display text-[9px] font-black uppercase italic tracking-wider text-black"
                      style={{ background: active ? C_SALAD : C_ORANGE }}
                      title={
                        active
                          ? "Билет начислен"
                          : "Ждём, пока друг добавит телефон в профиль"
                      }
                    >
                      {active ? "Активен" : "Без тел."}
                    </span>
                    <span
                      className="flex shrink-0 items-center gap-0.5 font-display text-[14px] font-black italic tabular-nums"
                      style={{ color: C_PINK }}
                    >
                      <PlumpTicket className="h-3.5 w-3.5" />+{f.ticketsRewarded}
                    </span>
                  </li>
                );
              })}
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

function PlumpTile({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div
      className="rounded-2xl border-[2px] border-foreground px-3 py-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]"
      style={{ background: color }}
    >
      <div className="flex items-center gap-1.5 font-display text-[10px] font-black uppercase italic tracking-wider text-black">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-black italic leading-none tabular-nums text-black">
        {value}
      </div>
    </div>
  );
}

function ShareTile({
  color,
  href,
  label,
  icon,
}: {
  color: string;
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex flex-col items-center justify-center gap-1 rounded-xl border-[2px] border-foreground py-2.5 text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
      style={{ background: color }}
    >
      {icon}
      <span className="font-display text-[10px] font-black uppercase italic tracking-wider">
        {label}
      </span>
    </a>
  );
}

function Step({ n, color, text }: { n: number; color: string; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border-[2px] border-foreground bg-card px-3 py-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-[2px] border-foreground font-display text-[14px] font-black italic text-black"
        style={{ background: color }}
      >
        {n}
      </span>
      <span className="pt-1 text-[14px] text-foreground/90">{text}</span>
    </li>
  );
}
