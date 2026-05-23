import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Тонкая обёртка над sonner. Все наши уведомления рендерятся через
 * `hhToast` (toast.custom) — здесь нужно только убрать дефолтный фон/рамку
 * sonner-а, чтобы наша капсула не получала двойную обводку.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "bg-transparent border-0 shadow-none p-0",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
