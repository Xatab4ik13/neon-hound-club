// Компактный блок рефералки для /club/me.

import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Ticket, Users } from "@/components/ui/icons";
import { useState } from "react";
import {
  buildReferralUrl,
  REFERRAL_REWARD_TICKETS,
  useInvitesMe,
} from "@/data/referral";

export function InviteBlock() {
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

  const totalTickets = data?.totals.tickets ?? 0;

  return (
    <section aria-label="Пригласить друга" className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
          Пригласить друга
        </h2>
        <Link
          to="/club/invite"
          className="group flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
        >
          Подробнее
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="border border-white/[0.06] bg-card/40 p-4">
        <p className="text-sm text-muted-foreground">
          За каждого друга, который зарегается по твоей ссылке —{" "}
          <span className="font-bold text-foreground">
            +{REFERRAL_REWARD_TICKETS} билетов
          </span>{" "}
          тебе и{" "}
          <span className="font-bold text-foreground">
            +{REFERRAL_REWARD_TICKETS} билетов
          </span>{" "}
          ему.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-xs">
            <span className="shrink-0 text-muted-foreground">ref:</span>
            <code className="truncate text-foreground">{url}</code>
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center justify-center gap-2 border border-primary bg-primary px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Скопировано" : "Скопировать"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            Приведено:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {friends.length}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <Ticket className="h-3.5 w-3.5 text-primary" />
            Заработано:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {totalTickets}
            </span>{" "}
            билетов
          </span>
        </div>
      </div>
    </section>
  );
}
