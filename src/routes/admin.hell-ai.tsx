// Hell AI — настройки модели, system prompt, журнал диалогов.
// Подгружает и сохраняет через /admin/hell-ai/*.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, RefreshCw, Save } from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Btn,
  TextInput,
  TextArea,
  Select,
  Field,
  Badge,
} from "@/components/admin/ui";
import { AdminPager, type AdminPageSize } from "@/components/admin/AdminPager";
import { apiFetch, ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin/hell-ai")({
  component: HellAiAdminPage,
});

type Settings = {
  id: number;
  systemPrompt: string;
  signature: string | null;
  bannedTopics: string | null;
  model: string;
  updatedAt: string;
};

type LogRow = {
  id: string;
  userId: string;
  userEmail: string | null;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: string;
};

type Stats = {
  totalQuestions: number;
  totalAnswers: number;
  tokensIn: number;
  tokensOut: number;
  uniqueUsers: number;
};

function HellAiAdminPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allowedModels, setAllowedModels] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState<AdminPageSize>(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [s, st, l] = await Promise.all([
        apiFetch<{ settings: Settings; allowedModels: string[] }>("/api/v1/admin/hell-ai/settings"),
        apiFetch<{ stats: Stats }>("/api/v1/admin/hell-ai/stats"),
        apiFetch<{ messages: LogRow[]; total: number; page: number; pageSize: number }>(
          `/api/v1/admin/hell-ai/log?page=${logPage}&pageSize=${logPageSize}`,
        ),
      ]);
      setSettings(s.settings);
      setAllowedModels(s.allowedModels);
      setStats(st.stats);
      setLog(l.messages);
      setLogTotal(l.total ?? l.messages.length);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 401
            ? "Нужно войти в админский аккаунт."
            : e.status === 403
              ? "Нет прав администратора."
              : e.message
          : "Бэкенд недоступен. Запусти Fastify (backend/) или укажи VITE_BACKEND_URL.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPage, logPageSize]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch<{ settings: Settings }>("/api/v1/admin/hell-ai/settings", {
        method: "PUT",
        body: JSON.stringify({
          systemPrompt: settings.systemPrompt,
          signature: settings.signature,
          bannedTopics: settings.bannedTopics,
          model: settings.model,
        }),
      });
      setSettings(res.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hell AI"
        description="AI-механик по своему мото. Настройки модели, system prompt и журнал."
        actions={
          <Btn variant="ghost" onClick={() => void reload()} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Обновить
          </Btn>
        }
      />

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Вопросов / мес" value={stats?.totalQuestions ?? "—"} />
        <StatCard label="Ответов / мес" value={stats?.totalAnswers ?? "—"} />
        <StatCard label="Уник. юзеров" value={stats?.uniqueUsers ?? "—"} />
        <StatCard label="Tokens in" value={stats?.tokensIn?.toLocaleString("ru-RU") ?? "—"} />
        <StatCard label="Tokens out" value={stats?.tokensOut?.toLocaleString("ru-RU") ?? "—"} />
      </div>

      {/* Настройки */}
      {settings && (
        <Panel>
          <PanelHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-semibold">Настройки модели</h2>
            </div>
            <div className="flex items-center gap-2">
              {saved && <Badge tone="emerald">Сохранено</Badge>}
              <Btn variant="primary" onClick={() => void save()} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Сохранение…" : "Сохранить"}
              </Btn>
            </div>
          </PanelHeader>

          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Модель" hint="Можно менять без редеплоя">
                <Select
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                >
                  {allowedModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Подпись в конце ответа" hint="Опционально, например «— Hell AI»">
                <TextInput
                  value={settings.signature ?? ""}
                  onChange={(e) => setSettings({ ...settings, signature: e.target.value || null })}
                  placeholder="без подписи"
                  maxLength={200}
                />
              </Field>
            </div>

            <Field
              label="System prompt"
              hint="Главный регулятор тона, тематик и фишек. Применяется ко всем ответам."
            >
              <TextArea
                value={settings.systemPrompt}
                onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                rows={16}
                className="font-mono text-xs"
              />
            </Field>

            <Field
              label="Дополнительно нельзя обсуждать"
              hint="Свободный текст. Добавляется в конец system prompt. Оставь пусто, если ничего не запрещаем."
            >
              <TextArea
                value={settings.bannedTopics ?? ""}
                onChange={(e) => setSettings({ ...settings, bannedTopics: e.target.value || null })}
                rows={3}
                placeholder="например: ставки, политика, продажа запрещённых веществ"
              />
            </Field>

            <p className="text-xs text-zinc-500">
              Обновлено: {new Date(settings.updatedAt).toLocaleString("ru-RU")}
            </p>
          </div>
        </Panel>
      )}

      {/* Журнал */}
      <Panel>
        <PanelHeader>
          <h2 className="text-sm font-semibold">Сообщения · {logTotal}</h2>
          <span className="text-xs text-zinc-500">контроль качества</span>
        </PanelHeader>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {log.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">пока пусто</div>
          )}
          {log.map((m) => (
            <div key={m.id} className="px-4 py-3 text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                <Badge tone={m.role === "user" ? "zinc" : "violet"}>{m.role}</Badge>
                <span>{m.userEmail ?? m.userId.slice(0, 8)}</span>
                <span>·</span>
                <span>{new Date(m.createdAt).toLocaleString("ru-RU")}</span>
                {m.model && (
                  <>
                    <span>·</span>
                    <span className="font-mono">{m.model}</span>
                  </>
                )}
                {(m.tokensIn != null || m.tokensOut != null) && (
                  <>
                    <span>·</span>
                    <span className="font-mono">
                      {m.tokensIn ?? 0}/{m.tokensOut ?? 0} tok
                    </span>
                  </>
                )}
              </div>
              <div className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                {m.content}
              </div>
            </div>
          ))}
        </div>
        <AdminPager
          page={logPage}
          pageSize={logPageSize}
          total={logTotal}
          onPageChange={setLogPage}
          onPageSizeChange={(s) => {
            setLogPageSize(s);
            setLogPage(1);
          }}
        />
      </Panel>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  const isNumeric = typeof value === "number";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">
        {isNumeric ? <PlumpNum value={value as number} size={18} format /> : value}
      </div>
    </div>
  );
}
