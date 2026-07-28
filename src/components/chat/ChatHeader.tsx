// Единая шапка для всех чатов клуба/кабинета блогера/школы.
// Одна строка: [назад] [аватарка] [ник + звание] [колокольчик].
// Собственный MobileTopBar на роутах чата скрыт — эта шапка занимает его место.

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PlumpArrowLeft as ArrowLeft, PlumpBell as Bell } from "@/components/ui/icons";
import { NotificationsSheet } from "@/components/club/NotificationsSheet";
import { haptic } from "@/hooks/use-haptic";
import { RANKS, type RankId } from "@/data/ranks";

type Props = {
  backTo: string;
  nick: string;
  role: string;
  /** Если задан — вместо `role` рендерится чип реального ранга (как в комментариях). */
  rankId?: string | null;
  avatarUrl?: string | null;
  showBell?: boolean;
  /** Кастомный узел вместо аватарки (например, HellhoundAvatar). */
  avatarNode?: React.ReactNode;
};

export function ChatHeader({ backTo, nick, role, avatarUrl, showBell = true, avatarNode }: Props) {
  const [notifOpen, setNotifOpen] = useState(false);
  const initial = nick.slice(0, 1).toUpperCase();

  const avatar =
    avatarNode ??
    (avatarUrl ? (
      <img
        src={avatarUrl}
        alt={nick}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    ) : (
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/30 font-display text-sm font-black uppercase text-black">
        {initial}
      </div>
    ));

  return (
    <>
      <div
        className="relative flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-black/70 px-2 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 6px)" }}
      >
        <Link
          to={backTo}
          onClick={() => haptic("light")}
          aria-label="Назад"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/90 hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {avatar}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
            {nick}
          </span>
          <span className="shrink-0 rounded-md bg-primary px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
            {role}
          </span>
        </div>

        {showBell ? (
          <button
            type="button"
            onClick={() => {
              haptic("light");
              setNotifOpen(true);
            }}
            aria-label="Уведомления"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/90 hover:bg-white/[0.06]"
          >
            <Bell className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      {showBell && <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />}
    </>
  );
}
