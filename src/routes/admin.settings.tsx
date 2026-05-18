import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, PanelHeader, Btn, DataTable, Badge, Field, TextInput } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

const TEAM = [
  { email: "hell@hellhound.club", role: "admin", since: "май 2024" },
  { email: "pavel@hellhound.club", role: "admin", since: "май 2024" },
];

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Настройки" description="Команда и общие параметры" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Команда</h3>
            <Btn variant="primary"><Plus className="h-4 w-4" /> Пригласить</Btn>
          </PanelHeader>
          <DataTable
            headers={["Email", "Роль", "С", ""]}
            rows={TEAM.map((t) => [
              <span className="font-medium">{t.email}</span>,
              <Badge tone="violet">{t.role}</Badge>,
              t.since,
              <Btn variant="ghost"><Trash2 className="h-3.5 w-3.5" /></Btn>,
            ])}
          />
        </Panel>

        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Общие</h3>
          </PanelHeader>
          <div className="space-y-3 p-4">
            <Field label="Кешбэк (рублей за 1 билет)" hint="Базовая ставка: 200 ₽ за билет">
              <TextInput type="number" defaultValue={200} />
            </Field>
            <Field label="Лимит товаров на главной">
              <TextInput type="number" defaultValue={6} />
            </Field>
            <Btn variant="primary">Сохранить</Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}
