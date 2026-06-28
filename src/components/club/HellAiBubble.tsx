// iOS-style сообщение Hell AI с markdown + long-press → action-sheet.
// Long-press 450ms на пузыре ответа открывает шторку: Copy / Regenerate / Share.

import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Drawer } from "vaul";
import { Copy, RefreshCw, Share2, Check } from "@/components/ui/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/use-haptic";

type Props = {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  onRegenerate?: () => void;
  /** Подпись под пузырём (байк, время и т.д.) — опционально */
  meta?: ReactNode;
};

export function HellAiBubble({ role, content, error, onRegenerate, meta }: Props) {
  const isUser = role === "user";
  const [sheetOpen, setSheetOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function onTouchStart() {
    movedRef.current = false;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      if (!movedRef.current) {
        haptic("selection");
        setSheetOpen(true);
      }
    }, 450);
  }
  function onTouchMove() {
    movedRef.current = true;
    clearTimer();
  }
  function onTouchEnd() {
    clearTimer();
  }

  const bubble = (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 32 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        onTouchStart={!isUser ? onTouchStart : undefined}
        onTouchMove={!isUser ? onTouchMove : undefined}
        onTouchEnd={!isUser ? onTouchEnd : undefined}
        onTouchCancel={!isUser ? onTouchEnd : undefined}
        className={cn(
          "max-w-[84%] select-none rounded-[22px] px-4 py-2.5 text-[17px] leading-[1.35] shadow-sm",
          isUser
            ? "rounded-br-[6px] bg-primary text-primary-foreground"
            : error
              ? "rounded-bl-[6px] border border-red-500/25 bg-red-500/[0.08] text-red-200"
              : "rounded-bl-[6px] border border-white/[0.06] bg-white/[0.05] text-foreground",
        )}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap break-words">{content}</span>
        ) : (
          <div className="markdown-body break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
        {meta && (
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-current/60">
            {meta}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      {bubble}

      <Drawer.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[20px] border-t border-white/[0.08] bg-[#0d0d0d] outline-none"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <Drawer.Title className="sr-only">Действия с сообщением</Drawer.Title>
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" />

            <div className="px-4 pb-4 pt-3">
              {/* превью пузыря */}
              <div className="mb-3 max-h-32 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-[15px] leading-snug text-foreground/85">
                <div className="line-clamp-4 break-words">{content}</div>
              </div>

              <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
                <ActionRow
                  icon={<Copy className="h-[18px] w-[18px]" />}
                  label="Скопировать"
                  onClick={async () => {
                    haptic("light");
                    try {
                      await navigator.clipboard.writeText(content);
                    } catch { /* ignore */ }
                    setSheetOpen(false);
                  }}
                />
                {onRegenerate && (
                  <ActionRow
                    icon={<RefreshCw className="h-[18px] w-[18px]" />}
                    label="Сгенерировать заново"
                    onClick={() => {
                      haptic("light");
                      setSheetOpen(false);
                      onRegenerate();
                    }}
                  />
                )}
                <ActionRow
                  icon={<Share2 className="h-[18px] w-[18px]" />}
                  label="Поделиться"
                  onClick={async () => {
                    haptic("light");
                    try {
                      if (navigator.share) {
                        await navigator.share({ text: content });
                      } else {
                        await navigator.clipboard.writeText(content);
                      }
                    } catch { /* ignore */ }
                    setSheetOpen(false);
                  }}
                />
              </ul>

              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="mt-3 grid h-12 w-full place-items-center rounded-2xl bg-white/[0.04] text-[16px] font-semibold text-foreground active:bg-white/[0.07]"
              >
                Отмена
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

function ActionRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.05]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-[16px] font-medium text-foreground">{label}</span>
        <Check className="ml-auto h-5 w-5 opacity-0" />
      </button>
    </li>
  );
}
