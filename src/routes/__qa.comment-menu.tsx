// QA-only route: изолированный стенд для IOSActionSheet поверх "карточки поста".
// Цель — воспроизвести и проверить баг "тап в пустоту → переход на пост".
// Удалить после прогона.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { IOSActionSheet, type ActionSheetItem } from "@/components/ios/IOSActionSheet";
import { REACTIONS } from "@/components/club/LikeButton";

export const Route = createFileRoute("/__qa/comment-menu")({
  component: QAPage,
});

function QAPage() {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEmoji, setOpenEmoji] = useState(false);
  const [cardClicks, setCardClicks] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);

  const items: ActionSheetItem[] = [
    { key: "reply", label: "Ответить", onSelect: () => setSelectedKey("reply") },
    { key: "react", label: "Реакция", onSelect: () => { setSelectedKey("react"); setOpenEmoji(true); } },
    { key: "copy", label: "Копировать текст", onSelect: () => setSelectedKey("copy") },
    { key: "delete", label: "Удалить", destructive: true, onSelect: () => setSelectedKey("delete") },
  ];

  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <h1 className="mb-3 text-lg font-bold">QA: comment menu</h1>
      <div className="mb-3 space-y-1 text-xs font-mono">
        <div data-testid="card-clicks">cardClicks={cardClicks}</div>
        <div data-testid="selected-key">selected={selectedKey ?? "—"}</div>
        <div data-testid="reaction">reaction={reaction ?? "—"}</div>
      </div>

      {/* "Карточка поста" — кликабельная, как PostCard. Если шит не ловит тап,
          этот счётчик увеличится → баг повторился. */}
      <button
        data-testid="fake-post"
        type="button"
        onClick={() => setCardClicks((n) => n + 1)}
        className="block w-full rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 text-left"
      >
        <div className="text-sm text-muted-foreground">Fake PostCard</div>
        <div className="mt-2">Если открыть меню и тапнуть в пустоту, этот счётчик НЕ должен расти.</div>

        {/* "···" внутри карточки — как в реальном комменте */}
        <button
          data-testid="more-button"
          type="button"
          aria-label="Ещё"
          onClick={(e) => { e.stopPropagation(); setOpenMenu(true); }}
          className="mt-3 inline-grid h-10 w-10 place-items-center rounded-full bg-white/5 text-lg"
        >
          ···
        </button>
      </button>

      <IOSActionSheet
        open={openMenu}
        onOpenChange={setOpenMenu}
        title="Действие"
        items={items}
      />

      <IOSActionSheet
        open={openEmoji}
        onOpenChange={setOpenEmoji}
        variant="emojiRow"
        items={REACTIONS.map((r) => ({
          key: r.key,
          label: r.emoji,
          onSelect: () => setReaction(r.key),
        }))}
      />
    </div>
  );
}
