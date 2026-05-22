import { useRouter, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronLeft } from "lucide-react";
import { ME } from "@/data/profile";
import { useCurrentRank } from "@/data/rank-state";
import { ProfilePlaque } from "@/routes/club";



// Routes that act as primary tabs — no back button, show avatar instead.
const TAB_PATHS = ["/club", "/club/garage", "/club/tickets", "/club/me"];

// Map pathname → compact title shown in the top bar.
function titleFor(pathname: string): string {
  if (pathname === "/club") return "Лента";
  if (pathname.startsWith("/club/garage")) return "Гараж";
  if (pathname.startsWith("/club/tickets")) return "Билеты";
  if (pathname.startsWith("/club/orders")) return "Заказы";
  if (pathname.startsWith("/club/rank")) return "Ранг";
  if (pathname.startsWith("/club/quests")) return "Квесты";
  if (pathname.startsWith("/club/raffles")) return "Розыгрыши";
  if (pathname.startsWith("/club/invite")) return "Пригласить";
  if (pathname.startsWith("/club/hell-ai")) return "Hell AI";
  if (pathname.startsWith("/club/hell-pass")) return "Hell Pass";
  if (pathname.startsWith("/club/school")) return "Школа";
  if (pathname.startsWith("/club/u/")) return "Профиль";
  if (pathname === "/club/me") return ME.nick;
  return "Клуб";
}

export function MobileTopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const { rank } = useCurrentRank();
  const isTab = TAB_PATHS.includes(pathname);
  const title = titleFor(pathname);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/club" });
    }
  };

  // On primary tabs — show the full branded plaque (avatar + nick + XP bar) like in settings.
  // Tapping it opens the profile/settings screen.
  if (isTab) {
    return (
      <header
        className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/85 backdrop-blur-xl lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <ProfilePlaque compact />
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

  // Nested routes — iOS-style back chevron + centered title + bell.
  // Suppress rank reference so we don't warn about unused vars on this branch.
  void rank;

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

        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 truncate font-display text-[16px] font-black italic uppercase tracking-tight">
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

