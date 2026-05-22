// iOS-style top bar для /blogger. На «вкладках» — Hell-плашка слева + колокольчик.
// На вложенных страницах — chevron «Назад» + центрированный заголовок.

import { useRouter, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronLeft } from "lucide-react";
import { HellhoundPlaqueLarge } from "@/components/club/HellhoundPlaque";
import { useBloggerProfile } from "@/data/blogger-profile";

const TAB_PATHS = ["/blogger", "/blogger/hell-ai", "/blogger/raffles", "/blogger/settings"];

function titleFor(pathname: string): string {
  if (pathname === "/blogger") return "Лента";
  if (pathname.startsWith("/blogger/hell-ai")) return "Hell AI";
  if (pathname.startsWith("/blogger/raffles")) return "Розыгрыши";
  if (pathname.startsWith("/blogger/settings")) return "Настройки";
  return "Блогер";
}

export function BloggerMobileTopBar({ onPlaqueClick }: { onPlaqueClick: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const profile = useBloggerProfile();
  const isTab = TAB_PATHS.includes(pathname);
  const title = titleFor(pathname);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/blogger" });
    }
  };

  if (isTab) {
    return (
      <header
        className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/85 backdrop-blur-xl lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <HellhoundPlaqueLarge
              nick={profile.nick}
              initials={profile.initials}
              avatarUrl={profile.avatarUrl}
              onClick={onPlaqueClick}
            />
          </div>
          <button
            type="button"
            aria-label="Уведомления"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center text-foreground active:opacity-60"
          >
            <Bell className="h-[20px] w-[20px]" strokeWidth={1.9} />
            <span aria-hidden className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/85 backdrop-blur-xl lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="relative flex h-11 items-center px-3">
        <div className="flex w-20 items-center">
          <button
            type="button"
            onClick={handleBack}
            className="-ml-1 flex h-8 items-center pl-1 pr-2 text-primary active:opacity-60"
            aria-label="Назад"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
            <span className="font-medium text-[15px]">Назад</span>
          </button>
        </div>

        <h1 className="pointer-events-none absolute left-1/2 max-w-[55%] -translate-x-1/2 overflow-hidden text-ellipsis whitespace-nowrap pr-[3px] font-display text-[16px] font-black italic uppercase tracking-tight">
          {title}
        </h1>

        <div className="ml-auto flex w-20 items-center justify-end">
          <button
            type="button"
            aria-label="Уведомления"
            className="relative flex h-8 w-8 items-center justify-center text-foreground active:opacity-60"
          >
            <Bell className="h-[20px] w-[20px]" strokeWidth={1.9} />
            <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
        </div>
      </div>
    </header>
  );
}
