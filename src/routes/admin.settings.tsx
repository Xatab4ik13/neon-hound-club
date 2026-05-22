import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Switch,
  Modal,
  ConfirmModal,
} from "@/components/admin/ui";
import {
  fetchAdminStaff,
  createAdminStaff,
  deleteAdminStaff,
  type AdminStaffItem,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const staffQ = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: fetchAdminStaff,
  });
  const staff = staffQ.data?.items ?? [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [del, setDel] = useState<AdminStaffItem | null>(null);

  const [maintenance, setMaintenance] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAdminStaff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success("Админ удалён");
      setDel(null);
    },
    onError: (e) => {
      const raw = e instanceof ApiError ? e.message : "Ошибка";
      toast.error(
        raw === "cannot_delete_self"
          ? "Нельзя удалить самого себя. Сделай это под другим админом."
          : raw,
      );
    },
  });

  const createMut = useMutation({
    mutationFn: (input: { email: string; password: string; nick: string }) =>
      createAdminStaff(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success("Админ добавлен");
      setInviteOpen(false);
    },
    onError: (e) => {
      const raw = e instanceof ApiError ? e.message : "Ошибка";
      const msg =
        raw === "email_taken"
          ? "Этот email уже занят"
          : raw === "nick_taken"
            ? "Этот ник уже занят"
            : raw;
      toast.error(msg);
    },
  });

  return (
    <div>
      <PageHeader title="Настройки" description="Команда, безопасность и общие параметры" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <div>
              <h3 className="text-sm font-semibold">Команда</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Доступ к админке. У этих аккаунтов нет клубного профиля.
              </p>
            </div>
            <Btn variant="primary" onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" /> Добавить
            </Btn>
          </PanelHeader>
          <DataTable
            headers={["Email", "Ник", "Роль", "С", ""]}
            rows={staff.map((t) => [
              <span className="font-medium">{t.email}</span>,
              <span className="text-zinc-600 dark:text-zinc-300">@{t.nick}</span>,
              <Badge tone="violet">{t.role}</Badge>,
              <span className="text-xs text-zinc-500">
                {new Date(t.createdAt).toLocaleDateString("ru-RU")}
              </span>,
              <Btn variant="ghost" onClick={() => setDel(t)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>,
            ])}
          />
          {staffQ.isLoading && (
            <div className="p-4 text-center text-xs text-zinc-500">Загрузка…</div>
          )}
          {!staffQ.isLoading && staff.length === 0 && (
            <div className="p-4 text-center text-xs text-zinc-500">Админов нет</div>
          )}
        </Panel>

        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Общие</h3>
          </PanelHeader>
          <div className="space-y-3 p-4">
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
        onSave={(m) => createMut.mutate(m)}
        loading={createMut.isPending}
      />

      <PasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && delMut.mutate(del.id)}
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
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (m: { email: string; password: string; nick: string }) => void;
  loading?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить админа"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn
            variant="primary"
            disabled={loading || !email || !nick || password.length < 8}
            onClick={() => onSave({ email, password, nick })}
          >
            {loading ? "Создаём…" : "Создать"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Email">
          <TextInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@hellhound.club"
          />
        </Field>
        <Field label="Ник (латиница, цифры, _)">
          <TextInput
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="admin_pavel"
          />
        </Field>
        <Field label="Пароль (минимум 8 символов)">
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <p className="text-xs text-zinc-500">
          У админа нет клубного аккаунта — в списке Пользователи он не появится.
        </p>
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
