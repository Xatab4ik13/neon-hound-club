// Все всплывающие уведомления отключены по запросу пользователя.
// Оставляем no-op API, чтобы не ломать существующие вызовы по проекту.
import type { ReactNode } from "react";

type Opts = {
  meta?: ReactNode;
  description?: ReactNode;
  duration?: number;
};

const noop = (_title?: ReactNode, _opts?: Opts) => "" as string | number;

export const hhToast = Object.assign(noop, {
  success: noop,
  error: noop,
  info: noop,
  message: noop,
  dismiss: (_id?: string | number) => {},
});
