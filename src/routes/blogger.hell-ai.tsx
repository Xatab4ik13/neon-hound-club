// Hell AI для блогера — переиспользуем компонент из /club. Тариф (квота) внутри
// HellAiPage сам определяет, что путь начинается с /blogger, и переключается
// на «∞» вопросов.

import { createFileRoute } from "@tanstack/react-router";
import { HellAiPage } from "./club.hell-ai";

export const Route = createFileRoute("/blogger/hell-ai")({
  head: () => ({
    meta: [
      { title: "Hell AI — кабинет блогера" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HellAiPage,
});
