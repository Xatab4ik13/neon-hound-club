import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, KeyRound, Loader2 } from "@/components/ui/icons";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Btn,
  DataTable,
  Badge,
  Field,
  TextInput,
  TextArea,
  Switch,
  Modal,
  ConfirmModal,
} from "@/components/admin/ui";
import {
  fetchAdminStaff,
  createAdminStaff,
  deleteAdminStaff,
  fetchAdminSettings,
  putAdminSetting,
  type AdminStaffItem,
  type SystemSettings,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function apiErr(e: unknown, fallback = "Ошибка") {
  return e instanceof ApiError ? e.message : fallback;
}

function SettingsPage() {
  const qc = useQueryClient();

  // ---- staff ----
  const staffQ = useQuery({ queryKey: ["admin", "staff"], queryFn: fetchAdminStaff });
  const staff = staffQ.data?.items ?? [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [del, setDel] = useState<AdminStaffItem | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAdminStaff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success("Админ удалён");
      setDel(null);
    },
    onError: (e) =>
      toast.error(
        apiErr(e) === "cannot_delete_self"
          ? "Нельзя удалить самого себя. Сделай это под другим админом."
          : apiErr(e),
      ),
  });

  const createMut = useMutation({
    mutationFn: (input: { email: string; password: string; nick: string }) => createAdminStaff(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast.success("Админ добавлен");
      setInviteOpen(false);
    },
    onError: (e) => {
      const raw = apiErr(e);
      const msg =
        raw === "email_taken" ? "Этот email уже занят" : raw === "nick_taken" ? "Этот ник уже занят" : raw;
      toast.error(msg);
    },
  });

  // ---- system settings ----
  const settingsQ = useQuery({ queryKey: ["admin", "settings"], queryFn: fetchAdminSettings });

  return (
    <div>
      <PageHeader title="Настройки" description="Команда, общие параметры клуба, обслуживание, AI-лимиты" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Team */}
        <Panel>
          <PanelHeader>
            <div>
              <h3 className="text-sm font-semibold">Команда</h3>
              <p className="mt-0.5 text-xs text-zinc-500">Доступ к админке. У этих аккаунтов нет клубного профиля.</p>
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
              <span className="text-xs text-zinc-500">{new Date(t.createdAt).toLocaleDateString("ru-RU")}</span>,
              <Btn variant="ghost" onClick={() => setDel(t)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>,
            ])}
          />
          {staffQ.isLoading && <div className="p-4 text-center text-xs text-zinc-500">Загрузка…</div>}
          {!staffQ.isLoading && staff.length === 0 && (
            <div className="p-4 text-center text-xs text-zinc-500">Админов нет</div>
          )}
        </Panel>

        {/* Club */}
        {settingsQ.data ? (
          <ClubPanel data={settingsQ.data} />
        ) : (
          <Panel>
            <PanelHeader>
              <h3 className="text-sm font-semibold">Клуб</h3>
            </PanelHeader>
            <SettingsLoading />
          </Panel>
        )}

        {/* Maintenance */}
        {settingsQ.data ? (
          <MaintenancePanel data={settingsQ.data} />
        ) : (
          <Panel>
            <PanelHeader>
              <h3 className="text-sm font-semibold">Обслуживание</h3>
            </PanelHeader>
            <SettingsLoading />
          </Panel>
        )}

        {/* Hell AI */}
        {settingsQ.data ? (
          <HellAiPanel data={settingsQ.data} />
        ) : (
          <Panel>
            <PanelHeader>
              <h3 className="text-sm font-semibold">Hell AI — лимиты</h3>
            </PanelHeader>
            <SettingsLoading />
          </Panel>
        )}

        {/* Admin alerts */}
        {settingsQ.data ? (
          <AlertsPanel data={settingsQ.data} />
        ) : (
          <Panel>
            <PanelHeader>
              <h3 className="text-sm font-semibold">Уведомления админам</h3>
            </PanelHeader>
            <SettingsLoading />
          </Panel>
        )}

        {/* Tax */}
        {settingsQ.data ? (
          <TaxPanel data={settingsQ.data} />
        ) : (
          <Panel>
            <PanelHeader>
              <h3 className="text-sm font-semibold">Налоги</h3>
            </PanelHeader>
            <SettingsLoading />
          </Panel>
        )}

        {/* Security */}
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Безопасность</h3>
          </PanelHeader>
          <div className="space-y-3 p-4">
            <Btn onClick={() => setPwdOpen(true)}>
              <KeyRound className="h-4 w-4" /> Сменить пароль
            </Btn>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">2FA подключим на этапе 2.</div>
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

function SettingsLoading() {
  return (
    <div className="flex h-24 items-center justify-center text-xs text-zinc-500">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка…
    </div>
  );
}

function useSettingMutation<K extends keyof SystemSettings>(key: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: SystemSettings[K]) => putAdminSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Сохранено");
    },
    onError: (e) => toast.error(apiErr(e)),
  });
}

function ClubPanel({ data }: { data: SystemSettings }) {
  const [name, setName] = useState(data.club.name);
  const [email, setEmail] = useState(data.club.contact_email);
  const [url, setUrl] = useState(data.club.support_url);
  useEffect(() => {
    setName(data.club.name);
    setEmail(data.club.contact_email);
    setUrl(data.club.support_url);
  }, [data]);
  const mut = useSettingMutation("club");
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Клуб</h3>
      </PanelHeader>
      <div className="space-y-3 p-4">
        <Field label="Название">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Контактный email">
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@hhr.pro" />
        </Field>
        <Field label="Ссылка на поддержку">
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://t.me/..." />
        </Field>
        <Btn
          variant="primary"
          disabled={mut.isPending}
          onClick={() => mut.mutate({ name, contact_email: email, support_url: url })}
        >
          {mut.isPending ? "Сохраняем…" : "Сохранить"}
        </Btn>
      </div>
    </Panel>
  );
}

function MaintenancePanel({ data }: { data: SystemSettings }) {
  const [enabled, setEnabled] = useState(data.maintenance.enabled);
  const [message, setMessage] = useState(data.maintenance.message);
  useEffect(() => {
    setEnabled(data.maintenance.enabled);
    setMessage(data.maintenance.message);
  }, [data]);
  const mut = useSettingMutation("maintenance");
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Обслуживание</h3>
      </PanelHeader>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div>
            <div className="text-sm font-medium">Режим обслуживания</div>
            <div className="text-xs text-zinc-500">Сайт покажет заглушку всем, кроме админов</div>
          </div>
          <Switch checked={enabled} onChange={setEnabled} />
        </div>
        <Field label="Сообщение для пользователей">
          <TextArea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Скоро вернёмся"
          />
        </Field>
        <Btn variant="primary" disabled={mut.isPending} onClick={() => mut.mutate({ enabled, message })}>
          {mut.isPending ? "Сохраняем…" : "Сохранить"}
        </Btn>
      </div>
    </Panel>
  );
}

function HellAiPanel({ data }: { data: SystemSettings }) {
  const [silver, setSilver] = useState(data.hell_ai.limit_silver);
  const [gold, setGold] = useState(data.hell_ai.limit_gold);
  const [platinum, setPlatinum] = useState(data.hell_ai.limit_platinum);
  useEffect(() => {
    setSilver(data.hell_ai.limit_silver);
    setGold(data.hell_ai.limit_gold);
    setPlatinum(data.hell_ai.limit_platinum);
  }, [data]);
  const mut = useSettingMutation("hell_ai");
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Hell AI — лимиты</h3>
      </PanelHeader>
      <div className="space-y-3 p-4">
        <p className="text-xs text-zinc-500">
          Лимит вопросов на 30 дней действия Pass. Для Platinum −1 = безлимит.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Silver">
            <TextInput type="number" value={silver} onChange={(e) => setSilver(Number(e.target.value))} />
          </Field>
          <Field label="Gold">
            <TextInput type="number" value={gold} onChange={(e) => setGold(Number(e.target.value))} />
          </Field>
          <Field label="Platinum">
            <TextInput type="number" value={platinum} onChange={(e) => setPlatinum(Number(e.target.value))} />
          </Field>
        </div>
        <Btn
          variant="primary"
          disabled={mut.isPending}
          onClick={() =>
            mut.mutate({ limit_silver: silver, limit_gold: gold, limit_platinum: platinum })
          }
        >
          {mut.isPending ? "Сохраняем…" : "Сохранить"}
        </Btn>
      </div>
    </Panel>
  );
}

function AlertsPanel({ data }: { data: SystemSettings }) {
  const [orders, setOrders] = useState(data.admin_alerts.new_orders);
  const [users, setUsers] = useState(data.admin_alerts.new_users);
  useEffect(() => {
    setOrders(data.admin_alerts.new_orders);
    setUsers(data.admin_alerts.new_users);
  }, [data]);
  const mut = useSettingMutation("admin_alerts");
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Уведомления админам</h3>
      </PanelHeader>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div>
            <div className="text-sm font-medium">Новые заказы</div>
            <div className="text-xs text-zinc-500">Email при каждом оплаченном заказе</div>
          </div>
          <Switch checked={orders} onChange={setOrders} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div>
            <div className="text-sm font-medium">Новые пользователи</div>
            <div className="text-xs text-zinc-500">Email при регистрации</div>
          </div>
          <Switch checked={users} onChange={setUsers} />
        </div>
        <Btn
          variant="primary"
          disabled={mut.isPending}
          onClick={() => mut.mutate({ new_orders: orders, new_users: users })}
        >
          {mut.isPending ? "Сохраняем…" : "Сохранить"}
        </Btn>
      </div>
    </Panel>
  );
}

function TaxPanel({ data }: { data: SystemSettings }) {
  const [rate, setRate] = useState(data.tax?.rate_percent ?? 7);
  useEffect(() => {
    setRate(data.tax?.rate_percent ?? 7);
  }, [data]);
  const mut = useSettingMutation("tax");
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Налоги</h3>
      </PanelHeader>
      <div className="space-y-3 p-4">
        <p className="text-xs text-zinc-500">
          Ставка УСН (доходы). Применяется автоматически к каждой подтверждённой оплате —
          создаётся операция «Налог УСН» в Экономике. 0 = не считать.
        </p>
        <Field label="Ставка, %">
          <TextInput
            type="number"
            step="0.1"
            min={0}
            max={50}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </Field>
        <Btn variant="primary" disabled={mut.isPending} onClick={() => mut.mutate({ rate_percent: rate })}>
          {mut.isPending ? "Сохраняем…" : "Сохранить"}
        </Btn>
      </div>
    </Panel>
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
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hellhound.club" />
        </Field>
        <Field label="Ник (латиница, цифры, _)">
          <TextInput value={nick} onChange={(e) => setNick(e.target.value)} placeholder="admin_pavel" />
        </Field>
        <Field label="Пароль (минимум 8 символов)">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
