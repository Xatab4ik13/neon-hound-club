import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { IOSSheet } from "@/components/ios/IOSSheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  fullHeight?: boolean;
  children: ReactNode;
  contentClassName?: string;
  /** Кастомный цвет CTA «Готово» на мобиле (iOS-sheet). */
  doneAccent?: string;
};

export function AdaptiveSheet({
  open,
  onOpenChange,
  title,
  fullHeight,
  children,
  contentClassName,
  doneAccent,
}: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <IOSSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        fullHeight={fullHeight}
        contentClassName={contentClassName}
        doneAccent={doneAccent}
      >
        {children}
      </IOSSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border-white/[0.08] bg-[#0d0d0d] p-0 text-foreground",
          // отключаем тяжёлые slide+zoom, оставляем только fade — иначе лагает при большом списке
          "!duration-150 data-[state=open]:!zoom-in-100 data-[state=closed]:!zoom-out-100 data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0 data-[state=closed]:!slide-out-to-left-0 data-[state=closed]:!slide-out-to-top-0",
          fullHeight && "h-[85vh] max-h-[900px]",
          contentClassName,
        )}
      >
        <DialogHeader className="shrink-0 border-b border-white/[0.06] px-6 py-4">
          <DialogTitle className="text-[15px] font-semibold text-white">
            {title}
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
