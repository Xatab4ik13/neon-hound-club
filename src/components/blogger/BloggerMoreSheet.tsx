import { Link } from "@tanstack/react-router";
import {
  PlumpArrowRight as ChevronRight,
  PlumpAI,
  PlumpSettings,
  PlumpLogout,
} from "@/components/ui/icons";
import type { SVGProps, ComponentType } from "react";
import { Drawer } from "vaul";
import { useState } from "react";
import { useViewer } from "@/hooks/use-viewer";
import { IOSConfirm } from "@/components/ios/IOSConfirm";

type Item = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  subtitle?: string;
};

const ITEMS: Item[] = [
  { label: "Hell AI", href: "/blogger/hell-ai", icon: PlumpAI, subtitle: "AI-механик по твоему мото" },
  { label: "Настройки", href: "/blogger/settings", icon: PlumpSettings },
];

export function BloggerMoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const close = () => onOpenChange(false);
  const { signOut } = useViewer();
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
          <Drawer.Title className="sr-only">Меню блогера</Drawer.Title>
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" />

          <div className="flex items-center justify-between px-5 pb-3 pt-3">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Ещё</h2>
            <button
              type="button"
              onClick={close}
              className="font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60"
            >
              Готово
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            <section className="mb-5">
              <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
                {ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={close}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/[0.04]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <item.icon className="h-[18px] w-[18px]" />
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
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => setConfirmLogout(true)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-white/[0.04]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-400">
                      <PlumpLogout className="h-[18px] w-[18px]" />
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
        title="Выйти?"
        description="Чтобы вернуться, нужно будет войти заново."
        confirmLabel="Выйти"
        destructive
        onConfirm={doLogout}
      />
    </Drawer.Root>
  );
}
