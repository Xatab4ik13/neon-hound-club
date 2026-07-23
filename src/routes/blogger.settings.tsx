// Настройки блогера — переиспользуем полноценную клубную модалку.
// Даёт: аватар, профиль+байк, соцсети, уведомления, смена пароля, удаление аккаунта, выход.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SettingsModal } from "@/components/club/SettingsModal";

export const Route = createFileRoute("/blogger/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — кабинет блогера" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BloggerSettingsPage,
});

function BloggerSettingsPage() {
  const navigate = useNavigate();
  return (
    <SettingsModal
      open
      onOpenChange={(v) => {
        if (!v) navigate({ to: "/blogger" });
      }}
    />
  );
}
