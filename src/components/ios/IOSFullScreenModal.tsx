// Тонкая обёртка над IOSOverlay для обратной совместимости с BikeFormModal API.

import type { ReactNode } from "react";
import { IOSOverlay } from "./IOSOverlay";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  doneLabel?: string;
  onDone?: () => void;
  doneDisabled?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
  contentClassName?: string;
  zIndexClassName?: string;
};

export function IOSFullScreenModal({
  open,
  onOpenChange,
  title,
  children,
  doneLabel,
  onDone,
  doneDisabled,
  cancelLabel,
  onCancel,
  contentClassName,
  zIndexClassName,
}: Props) {
  return (
    <IOSOverlay
      open={open}
      onClose={() => onOpenChange(false)}
      title={title}
      cancelLabel={cancelLabel}
      onCancel={onCancel}
      doneLabel={doneLabel}
      onDone={onDone}
      doneDisabled={doneDisabled}
      zIndexClassName={zIndexClassName}
      contentClassName={contentClassName ?? "px-4 pt-4"}
    >
      {children}
    </IOSOverlay>
  );
}
