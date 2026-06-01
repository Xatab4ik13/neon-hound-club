import { Link } from "@tanstack/react-router";
import {
  Gem,
  Target,
  UserPlus,
  GraduationCap,
  Settings,
  LogOut,
  ChevronRight,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { Drawer } from "vaul";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";
import { IOSConfirm } from "@/components/ios/IOSConfirm";
import { isStandalonePWA } from "@/lib/is-pwa";

type Item = {
  label: string;
  href: string;
  icon: LucideIcon;
  subtitle?: string;
  badge?: number;
};

function buildGroups(cartCount: number, isPwa: boolean): { title: string; items: Item[] }[] {
  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Клуб",
      items: [
        { label: "Hell Pass", href: "/club/hell-pass", icon: Gem, subtitle: "Подписка клуба" },
        { label: "Розыгрыши", href: "/club/raffles", icon: Ticket },
        { label: "Магазин клуба", href: "/club/shop", icon: ShoppingBag },
        { label: "Школа", href: "/club/school", icon: GraduationCap },
      ],
    },
    {
      title: "Активность",
      items: [
        { label: "Пригласить друга", href: "/club/invite", icon: UserPlus },
        { label: "Квесты", href: "/club/quests", icon: Target },
        {
          label: "Корзина",
          href: "/club/cart",
          icon: ShoppingCart,
          badge: cartCount > 0 ? cartCount : undefined,
        },
      ],
    },
  ];

  if (isPwa) {
    groups.push({
      title: "Поддержка",
      items: [
        { label: "Помощь", href: "/club/help", icon: LifeBuoy, subtitle: "Баги, идеи, вопросы" },
      ],
    });
  }

  return groups;
}


export function MobileMoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const close = () => onOpenChange(false);
  const { count: cartCount } = useCart();
  const { signOut } = useViewer();
  const [isPwa, setIsPwa] = useState(false);
  useEffect(() => setIsPwa(isStandalonePWA()), []);
  const GROUPS = buildGroups(cartCount, isPwa);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const doLogout = async () => {
    try {
      await signOut();
    } finally {
      onOpenChange(false);
      window.location.href = "/";
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[88vh] flex-col rounded-t-[20px] border-t border-white/[0.08] bg-[#0d0d0d] outline-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Drawer.Title className="sr-only">Навигация клуба</Drawer.Title>
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" />

          <div className="flex items-center justify-between px-5 pb-3 pt-3">
            <h2 className="font-display text-2xl font-black italic uppercase tracking-tight">Ещё</h2>
            <button
              type="button"
              onClick={close}
              className="font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60"
            >
              Готово
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {GROUPS.map((group) => (
              <section key={group.title} className="mb-5">
                <h3 className="mb-1.5 px-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={close}
                        className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/[0.04]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[16px] font-semibold text-foreground">
                            {item.label}
                          </span>
                          {item.subtitle ? (
                            <span className="mt-0.5 block text-[12px] text-muted-foreground">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>
                        {item.badge ? (
                          <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 font-mono text-[10px] font-bold leading-none text-primary-foreground">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="mb-2">
              <h3 className="mb-1.5 px-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Аккаунт
              </h3>
              <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
                <li>
                  <Link
                    to="/club/me"
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/[0.04]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-foreground">
                      <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
                    </span>
                    <span className="flex-1 text-[16px] font-semibold text-foreground">
                      Настройки
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setConfirmLogout(true)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-white/[0.04]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-400">
                      <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
                    </span>
                    <span className="flex-1 text-[16px] font-semibold text-red-400">Выйти</span>
                  </button>
                </li>
              </ul>
            </section>
          </div>
        </Drawer.Content>
      </Drawer.Portal>

      <IOSConfirm
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Выйти из клуба?"
        description="Чтобы вернуться, нужно будет войти заново."
        confirmLabel="Выйти"
        destructive
        onConfirm={doLogout}
      />
    </Drawer.Root>
  );
}
