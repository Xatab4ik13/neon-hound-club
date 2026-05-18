import { Plus } from "lucide-react";

export function EmptyGarageSlot({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex min-h-[140px] flex-col items-center justify-center gap-2 border border-dashed border-white/[0.12] bg-card/20 p-4 text-muted-foreground transition-all hover:border-primary/50 hover:bg-card/30 hover:text-primary md:min-h-[260px] md:gap-3 md:p-6"
    >
      <div className="flex h-9 w-9 items-center justify-center border border-current opacity-60 transition-opacity group-hover:opacity-100 md:h-12 md:w-12">
        <Plus className="h-5 w-5 md:h-6 md:w-6" />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] md:text-[11px] md:tracking-[0.25em]">
        Добавить байк
      </span>
    </button>
  );
}
