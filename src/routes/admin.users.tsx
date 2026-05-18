import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, DataTable, Badge, Btn, TextInput } from "@/components/admin/ui";
import { PUBLIC_USERS } from "@/data/users";
import { RANKS } from "@/data/ranks";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const users = Object.values(PUBLIC_USERS);

  return (
    <div>
      <PageHeader title="Пользователи" description={`Всего: ${users.length}`} />

      <div className="mb-3 flex gap-2">
        <TextInput placeholder="Поиск по нику, email, телефону…" className="max-w-md" />
        <Btn>Фильтры</Btn>
      </div>

      <Panel>
        <DataTable
          headers={["Ник", "Город", "Мото", "Ранг", "Pass", "XP", ""]}
          rows={users.map((u) => {
            const rank = RANKS.find((r) => r.id === u.rank);
            return [
              <span className="font-medium">{u.nick}</span>,
              u.city ?? "—",
              <span className="text-zinc-500 dark:text-zinc-400">{u.bike ?? "—"}</span>,
              <Badge tone={u.rank === "vip" ? "violet" : u.rank === "hell-legend" ? "rose" : "zinc"}>
                {rank?.name ?? u.rank}
              </Badge>,
              <Badge tone="blue">Silver</Badge>,
              `${u.xpPct}%`,
              <Btn variant="ghost">Открыть</Btn>,
            ];
          })}
        />
      </Panel>
    </div>
  );
}
