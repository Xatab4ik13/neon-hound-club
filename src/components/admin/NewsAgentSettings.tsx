// Таб «Источники и настройки» на /admin/news: RSS-фиды агента, модели, порог отбора, промт.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Flame, AlertTriangle } from "@/components/ui/icons";

import {
  Panel,
  Btn,
  Badge,
  Field,
  TextInput,
  TextArea,
  Switch,
  Select,
  Modal,
} from "@/components/admin/ui";
import {
  adminNewsAgentQk,
  fetchNewsAgentState,
  patchNewsAgentState,
  fetchNewsAgentSources,
  createNewsAgentSource,
  patchNewsAgentSource,
  deleteNewsAgentSource,
  type NewsAgentSource,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";

function apiErr(e: unknown, fallback = "Ошибка") {
  if (e instanceof ApiError) {
    const m = (e.message || "").trim();
    return m && m !== "Bad Request" ? m : fallback;
  }
  return fallback;
}

export function NewsAgentSettings() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const stateQ = useQuery({ queryKey: [...adminNewsAgentQk, "state"], queryFn: fetchNewsAgentState });
  const srcQ = useQuery({ queryKey: [...adminNewsAgentQk, "sources"], queryFn: fetchNewsAgentSources });

  const refetch = () => void qc.invalidateQueries({ queryKey: adminNewsAgentQk });

  // ─── Настройки ───────────────────────────────────────────────────
  const st = stateQ.data?.state;
  const [form, setForm] = useState({
    enabled: true,
    filterModel: "",
    writerModel: "",
    minScore: 62,
    hotDraftCap: 3,
    normalDraftCap: 6,
    queueGapMin: 100,
    prompt: "",
  });

  useEffect(() => {
    if (!st) return;
    setForm({
      enabled: st.enabled,
      filterModel: st.filterModel,
      writerModel: st.writerModel,
      minScore: st.minScore,
      hotDraftCap: st.hotDraftCap,
      normalDraftCap: st.normalDraftCap,
      queueGapMin: st.queueGapMin,
      prompt: st.prompt || st.defaultPrompt,
    });
  }, [st]);

  const saveMut = useMutation({
    mutationFn: () => patchNewsAgentState(form),
    onSuccess: () => {
      toast.success("Настройки сохранены");
      refetch();
    },
    onError: (e) => toast.error(apiErr(e, "Не получилось сохранить")),
  });

  // ─── Источники ───────────────────────────────────────────────────
  const toggleMut = useMutation({
    mutationFn: (s: NewsAgentSource) => patchNewsAgentSource(s.id, { active: !s.active }),
    onSuccess: () => refetch(),
    onError: (e) => toast.error(apiErr(e, "Не получилось переключить")),
  });

  const streamMut = useMutation({
    mutationFn: (s: NewsAgentSource) =>
      patchNewsAgentSource(s.id, { stream: s.stream === "hot" ? "normal" : "hot" }),
    onSuccess: () => refetch(),
    onError: (e) => toast.error(apiErr(e, "Не получилось изменить поток")),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteNewsAgentSource(id),
    onSuccess: () => {
      toast.success("Источник удалён");
      refetch();
    },
    onError: (e) => toast.error(apiErr(e, "Не получилось удалить")),
  });

  const sources = srcQ.data?.items ?? [];
  const broken = sources.filter((s) => s.lastError);

  return (
    <div className="space-y-4">
      <Panel>
        <div className="border-b border-zinc-200 p-3 text-sm font-semibold dark:border-zinc-800">
          Настройки агента
        </div>
        <div className="space-y-4 p-3">
          <Switch
            label="Агент включён (сам ищет новости по расписанию)"
            checked={form.enabled}
            onChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Модель отбора" hint="Дешёвая — прогоняет заголовки батчами.">
              <TextInput
                value={form.filterModel}
                onChange={(e) => setForm((p) => ({ ...p, filterModel: e.target.value }))}
              />
            </Field>
            <Field label="Модель рерайта" hint="Пишет русский текст в двух вариантах.">
              <TextInput
                value={form.writerModel}
                onChange={(e) => setForm((p) => ({ ...p, writerModel: e.target.value }))}
              />
            </Field>
            <Field label="Порог отбора (0–100)" hint="Ниже порога новость отбрасывается без рерайта.">
              <TextInput
                type="number"
                value={String(form.minScore)}
                onChange={(e) => setForm((p) => ({ ...p, minScore: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Интервал очереди, мин" hint="Через сколько выходит следующий пост из очереди.">
              <TextInput
                type="number"
                value={String(form.queueGapMin)}
                onChange={(e) => setForm((p) => ({ ...p, queueGapMin: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Черновиков за прогон: горячее" hint="Прогон каждые 15 минут.">
              <TextInput
                type="number"
                value={String(form.hotDraftCap)}
                onChange={(e) => setForm((p) => ({ ...p, hotDraftCap: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Черновиков за прогон: обычное" hint="Прогон каждые 2 часа.">
              <TextInput
                type="number"
                value={String(form.normalDraftCap)}
                onChange={(e) => setForm((p) => ({ ...p, normalDraftCap: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <Field
            label="Промт редактора"
            hint="Стиль, тон и терминология. Язык постов — всегда русский."
          >
            <TextArea
              rows={14}
              value={form.prompt}
              maxLength={20000}
              onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
            />
          </Field>

          <div className="flex items-center gap-2">
            <Btn onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Сохранение…" : "Сохранить настройки"}
            </Btn>
            {st && (
              <Btn
                variant="ghost"
                onClick={() => setForm((p) => ({ ...p, prompt: st.defaultPrompt }))}
              >
                Вернуть промт по умолчанию
              </Btn>
            )}
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-sm font-semibold">
            Источники{" "}
            <span className="text-xs font-normal text-zinc-500">
              ({sources.filter((s) => s.active).length} активных из {sources.length})
            </span>
          </div>
          <Btn onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" /> Добавить фид
          </Btn>
        </div>

        {broken.length > 0 && (
          <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{broken.length} источник(ов) с ошибкой</span>

          </div>
        )}

        {srcQ.isLoading ? (
          <div className="flex items-center justify-center p-12 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sources.map((s) => (
              <li key={s.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{s.name}</span>
                    <Badge tone={s.stream === "hot" ? "amber" : "zinc"}>
                      {s.stream === "hot" ? "горячее" : "обычное"}
                    </Badge>
                    <Badge>{s.lang.toUpperCase()}</Badge>
                    {s.weight > 0 && <Badge>вес +{s.weight}</Badge>}
                    {!s.active && <Badge tone="rose">выключен</Badge>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-zinc-500">{s.url}</div>
                  {s.lastError ? (
                    <div className="mt-0.5 truncate text-xs text-rose-500">{s.lastError}</div>
                  ) : (
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {s.lastFetchedAt
                        ? `последний опрос: ${new Date(s.lastFetchedAt).toLocaleString("ru-RU")}`
                        : "ещё не опрашивался"}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => streamMut.mutate(s)}
                    className={`rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      s.stream === "hot" ? "text-amber-500" : "text-zinc-400"
                    }`}
                    title="Переключить поток"
                  >
                    <Flame className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMut.mutate(s)}
                    className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {s.active ? "Выключить" : "Включить"}
                  </button>
                  <button
                    type="button"
                    onClick={() => delMut.mutate(s.id)}
                    className="rounded p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {adding && <SourceModal onClose={() => setAdding(false)} onSaved={refetch} />}
    </div>
  );
}

function SourceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "",
    url: "",
    lang: "en",
    stream: "normal" as "hot" | "normal",
    weight: 4,
    active: true,
  });

  const mut = useMutation({
    mutationFn: () => createNewsAgentSource(form),
    onSuccess: () => {
      toast.success("Источник добавлен");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(apiErr(e, "Не получилось добавить")),
  });

  return (
    <Modal
      open
      title="Новый RSS-источник"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>
            Отмена
          </Btn>
          <Btn
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.name.trim() || !/^https?:\/\//.test(form.url)}
          >
            {mut.isPending ? "Добавление…" : "Добавить"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Название">
          <TextInput
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="BikeEXIF"
          />
        </Field>
        <Field label="URL фида" hint="Ссылка на RSS/Atom, не на сайт.">
          <TextInput
            value={form.url}
            onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
            placeholder="https://example.com/feed"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Язык">
            <Select value={form.lang} onChange={(e) => setForm((p) => ({ ...p, lang: e.target.value }))}>
              {["ru", "en", "ja", "zh", "de", "it", "es", "fr"].map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Поток" hint="Горячее — опрос каждые 15 мин.">
            <Select
              value={form.stream}
              onChange={(e) => setForm((p) => ({ ...p, stream: e.target.value as "hot" | "normal" }))}
            >
              <option value="normal">обычное (2 ч)</option>
              <option value="hot">горячее (15 мин)</option>
            </Select>
          </Field>
          <Field label="Вес доверия (0–20)">
            <TextInput
              type="number"
              value={String(form.weight)}
              onChange={(e) => setForm((p) => ({ ...p, weight: Number(e.target.value) }))}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
