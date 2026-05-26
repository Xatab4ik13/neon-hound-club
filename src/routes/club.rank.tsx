// /club/rank → редирект на /club/me (ранг и XP теперь живут внутри профиля).
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/club/rank")({
  beforeLoad: () => {
    throw redirect({ to: "/club/me" });
  },
});
