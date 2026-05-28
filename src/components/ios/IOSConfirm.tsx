// iOS-style тёмный confirm-диалог. Заменяет window.confirm.
// Использование: контролируемый open + onConfirm.

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function IOSConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  destructive = false,
  onConfirm,
}: Props) {
  const handleConfirm = async () => {
    onOpenChange(false);
    await onConfirm();
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[340] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <AlertDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[341] w-[270px] -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c1c1e]/95 backdrop-blur-2xl",
            "shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          )}
        >
          <div className="px-4 pb-4 pt-5 text-center">
            <AlertDialog.Title className="text-[17px] font-semibold leading-tight text-white">
              {title}
            </AlertDialog.Title>
            {description && (
              <AlertDialog.Description className="mt-1.5 text-[13px] leading-snug text-white/65">
                {description}
              </AlertDialog.Description>
            )}
          </div>
          <div className="grid grid-cols-2 border-t border-white/[0.08]">
            <AlertDialog.Cancel className="border-r border-white/[0.08] px-3 py-3 text-[17px] font-normal text-primary transition-colors active:bg-white/[0.04]">
              {cancelLabel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={handleConfirm}
              className={cn(
                "px-3 py-3 text-[17px] transition-colors active:bg-white/[0.04]",
                destructive ? "font-semibold text-[#ff453a]" : "font-semibold text-primary",
              )}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
