import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Edit, Trash2 } from "lucide-react";
import { PageHeader, Panel, Btn, DataTable, Badge, TextInput } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/raffles")({
  component: RafflesPage,
});

const MOCK = [
  { id: "1", name: "Шлем AGV K6", price: 50, status: "active", ends: "2026-05-20", participants: 284 },
  { id: "2", name: "Перчатки v3", price: 20, status: "active", ends: "2026-05-22", participants: 127 },
  { id: "3", name: "Худи Founder S01", price: 30, status: "active", ends: "2026-05-25", participants: 412 },
  { id: "4", name: "Race Pass Gold (3 мес)", price: 100, status: "draft", ends: "—", participants: 0 },
  { id: "5", name: "Перчатки Пит-крю", price: 15, status: "finished", ends: "2026-04-30", participants: 198 },
];

function RafflesPage() {
  return (
    <div>
      <PageHeader
        title="Розыгрыши"
        description="Управление лотами и участием"
        actions={
          <Btn variant="primary">
            <Plus className="h-4 w-4" />
            Новый розыгрыш
          </Btn>
        }
      />

      <div className="mb-3 flex gap-2">
        <TextInput placeholder="Поиск по названию…" className="max-w-sm" />
      </div>

      <Panel>
        <DataTable
          headers={["Название", "Цена", "Окончание", "Участников", "Статус", ""]}
          rows={MOCK.map((r) => [
            <span className="font-medium">{r.name}</span>,
            `${r.price} 🎟`,
            r.ends,
            r.participants,
            <Badge
              tone={
                r.status === "active" ? "emerald" : r.status === "draft" ? "zinc" : "rose"
              }
            >
              {r.status === "active" ? "Активен" : r.status === "draft" ? "Черновик" : "Завершён"}
            </Badge>,
            <div className="flex gap-1">
              <Btn variant="ghost" aria-label="Редактировать">
                <Edit className="h-3.5 w-3.5" />
              </Btn>
              <Btn variant="ghost" aria-label="Удалить">
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>,
          ])}
        />
      </Panel>
    </div>
  );
}
