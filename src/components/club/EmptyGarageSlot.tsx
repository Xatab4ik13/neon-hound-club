import { Plus } from "lucide-react";

export function EmptyGarageSlot({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex min-h-[260px] flex-col items-center justify-center gap-3 border border-dashed border-white/[0.12] bg-card/20 p-6 text-muted-foreground transition-all hover:border-primary/50 hover:bg-card/30 hover:text-primary"
    >
      <div className="flex h-12 w-12 items-center justify-center border border-current opacity-60 transition-opacity group-hover:opacity-100">
        <Plus className="h-6 w-6" />
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.25em]">
        Добавить байк
      </span>
    </button>
  );
}
