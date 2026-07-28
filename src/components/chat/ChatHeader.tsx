// Единая шапка для всех чатов клуба/кабинета блогера/школы.
// Слева — «назад», по центру — круглая аватарка собеседника, его ник и звание
// (как в комментариях ленты), справа — колокольчик уведомлений.
// Собственный MobileTopBar на роутах чата скрыт — эта шапка занимает его место.

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PlumpArrowLeft as ArrowLeft, PlumpBell as Bell } from "@/components/ui/icons";
import { NotificationsSheet } from "@/components/club/NotificationsSheet";
import { haptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";

type Props = {
  backTo: string;
  nick: string;
  role: string;
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
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />
    ) : (
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/30 font-display font-black uppercase text-black">
        {initial}
      </div>
    ));

  return (
    <>
      <div
        className={cn(
          "relative flex shrink-0 items-start justify-between border-b border-white/[0.06] bg-black/70 px-2 pb-2",
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 6px)" }}
      >
        <Link
          to={backTo}
          onClick={() => haptic("light")}
          aria-label="Назад"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground/90 hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col items-center px-2">
          {avatar}
          <div className="mt-1 max-w-full truncate font-display text-[14px] font-black uppercase tracking-tight text-foreground">
            {nick}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {role}
          </div>
        </div>

        {showBell ? (
          <button
            type="button"
            onClick={() => {
              haptic("light");
              setNotifOpen(true);
            }}
            aria-label="Уведомления"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground/90 hover:bg-white/[0.06]"
          >
            <Bell className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-10 w-10 shrink-0" />
        )}
      </div>
      {showBell && <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />}
    </>
  );
}
