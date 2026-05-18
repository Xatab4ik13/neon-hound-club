import { createFileRoute } from "@tanstack/react-router";
import { Plus, Edit, Trash2 } from "lucide-react";
import { PageHeader, Panel, Btn, DataTable, Badge, TextInput } from "@/components/admin/ui";
import { NEWS } from "@/data/news";

export const Route = createFileRoute("/admin/news")({
  component: NewsPage,
});

function NewsPage() {
  return (
    <div>
      <PageHeader
        title="Новости"
        description="SEO-статьи для продвижения. Перед публикацией заполните meta и og:image."
        actions={
          <Btn variant="primary">
            <Plus className="h-4 w-4" /> Новая статья
          </Btn>
        }
      />

      <div className="mb-3 flex gap-2">
        <TextInput placeholder="Поиск по заголовку…" className="max-w-sm" />
      </div>

      <Panel>
        <DataTable
          headers={["Заголовок", "Тег", "Дата", "Статус", ""]}
          rows={NEWS.map((n) => [
            <div>
              <div className="font-medium">{n.title}</div>
              <div className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">{n.excerpt}</div>
            </div>,
            <Badge tone="blue">{n.tag}</Badge>,
            new Date(n.date).toLocaleDateString("ru-RU"),
            <Badge tone="emerald">Опубликована</Badge>,
            <div className="flex gap-1">
              <Btn variant="ghost"><Edit className="h-3.5 w-3.5" /></Btn>
              <Btn variant="ghost"><Trash2 className="h-3.5 w-3.5" /></Btn>
            </div>,
          ])}
        />
      </Panel>
    </div>
  );
}
