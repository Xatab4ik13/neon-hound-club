import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, KeyRound } from "lucide-react";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Btn,
  DataTable,
  Badge,
  Field,
  TextInput,
  Select,
  Switch,
  Modal,
  ConfirmModal,
} from "@/components/admin/ui";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

type TeamMember = { id: string; email: string; role: "admin" | "manager"; since: string };

const TEAM_SEED: TeamMember[] = [
  { id: "1", email: "hell@hellhound.club", role: "admin", since: "май 2024" },
  { id: "2", email: "pavel@hellhound.club", role: "admin", since: "май 2024" },
];

function SettingsPage() {
  const [team, setTeam] = useState<TeamMember[]>(TEAM_SEED);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [del, setDel] = useState<TeamMember | null>(null);

  const [maintenance, setMaintenance] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);

  return (
    <div>
      <PageHeader title="Настройки" description="Команда, безопасность и общие параметры" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Команда</h3>
            <Btn variant="primary" onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" /> Пригласить
            </Btn>
          </PanelHeader>
          <DataTable
            headers={["Email", "Роль", "С", ""]}
            rows={team.map((t) => [
              <span className="font-medium">{t.email}</span>,
              <Badge tone={t.role === "admin" ? "violet" : "blue"}>{t.role}</Badge>,
              t.since,
              <Btn variant="ghost" onClick={() => setDel(t)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>,
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
            <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <div>
                <div className="text-sm font-medium">Email-уведомления</div>
                <div className="text-xs text-zinc-500">Заказы, новые подписки</div>
              </div>
              <Switch checked={emailNotif} onChange={setEmailNotif} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <div>
                <div className="text-sm font-medium">Режим обслуживания</div>
                <div className="text-xs text-zinc-500">Сайт покажет заглушку всем, кроме админов</div>
              </div>
              <Switch checked={maintenance} onChange={setMaintenance} />
            </div>
            <Btn variant="primary">Сохранить</Btn>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Безопасность</h3>
          </PanelHeader>
          <div className="space-y-3 p-4">
            <Btn onClick={() => setPwdOpen(true)}>
              <KeyRound className="h-4 w-4" /> Сменить пароль
            </Btn>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              2FA подключим на этапе 2.
            </div>
          </div>
        </Panel>
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSave={(m) => {
          setTeam((l) => [...l, { ...m, id: String(Date.now()), since: "только что" }]);
          setInviteOpen(false);
        }}
      />

      <PasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && setTeam((l) => l.filter((x) => x.id !== del.id))}
        title="Убрать из команды?"
        message={`${del?.email} потеряет доступ к админке.`}
        confirmLabel="Удалить"
      />
    </div>
  );
}

function InviteModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (m: { email: string; role: "admin" | "manager" }) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager">("admin");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Пригласить в команду"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={() => email && onSave({ email, role })}>
            Отправить
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Email">
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hellhound.club" />
        </Field>
        <Field label="Роль">
          <Select value={role} onChange={(e) => setRole(e.target.value as "admin" | "manager")}>
            <option value="admin">admin</option>
            <option value="manager">manager</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Сменить пароль"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={onClose}>
            Сохранить
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Текущий пароль">
          <TextInput type="password" />
        </Field>
        <Field label="Новый пароль">
          <TextInput type="password" />
        </Field>
        <Field label="Повторите новый">
          <TextInput type="password" />
        </Field>
      </div>
    </Modal>
  );
}
