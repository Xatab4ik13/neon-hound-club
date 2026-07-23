// /admin/news — минимальный CRUD для новостных постов (лента NEWS в /club).
// Заглушка: комментарии на бэке пока не реализованы, счётчик commentsCount = 0.

import { createFileRoute } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Pin } from "@/components/ui/icons";

import {
  PageHeader,
  Panel,
  Btn,
  Field,
  TextInput,
  TextArea,
  Switch,
  Select,
  Modal,
  ConfirmModal,
  Badge,
} from "@/components/admin/ui";
import {
  fetchAdminNews,
  createAdminNews,
  patchAdminNews,
  publishAdminNews,
  unpublishAdminNews,
  deleteAdminNews,
  adminNewsQk,
  type AdminNewsItem,
  type AdminNewsInput,
} from "@/lib/admin-queries";
import { uploadFileToS3 } from "@/lib/garage-api";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/admin/news")({
  component: NewsPage,
});

function apiErr(e: unknown, fallback = "Ошибка") {
  if (e instanceof ApiError) {
    const m = (e.message || "").trim();
    return m && m !== "Bad Request" ? m : fallback;
  }
  return fallback;
}

type StatusFilter = "all" | "published" | "drafts";

function NewsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<AdminNewsItem | "new" | null>(null);
  const [toDelete, setToDelete] = useState<AdminNewsItem | null>(null);

  const qk = [...adminNewsQk, status] as const;
  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () => fetchAdminNews(status),
  });
  const items = data?.items ?? [];

  const refetch = () => qc.invalidateQueries({ queryKey: adminNewsQk });

  const publishMut = useMutation({
    mutationFn: (p: AdminNewsItem) =>
      p.published ? unpublishAdminNews(p.id) : publishAdminNews(p.id),
    onSuccess: () => refetch(),
    onError: (e) => toast.error(apiErr(e, "Не получилось изменить статус")),
  });

  const pinMut = useMutation({
    mutationFn: (p: AdminNewsItem) => patchAdminNews(p.id, { pinned: !p.pinned }),
    onSuccess: () => refetch(),
    onError: (e) => toast.error(apiErr(e, "Не получилось изменить закреп")),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAdminNews(id),
    onSuccess: () => {
      refetch();
      toast.success("Новость удалена");
      setToDelete(null);
    },
    onError: (e) => toast.error(apiErr(e, "Не получилось удалить")),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Новости"
        description="Лента NEWS в клубе. Позже сюда подключим AI-агента, который будет сам писать посты."
        actions={
          <Btn onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Новый пост
          </Btn>
        }
      />

      <Panel>
        <div className="flex items-center gap-2 border-b border-zinc-200 p-3 text-sm dark:border-zinc-800">
          {(["all", "published", "drafts"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                status === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {s === "all" ? "Все" : s === "published" ? "Опубликованные" : "Черновики"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            Пока нет постов. Нажми «Новый пост».
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((p) => (
              <li key={p.id} className="flex items-start gap-3 p-3">
                <div
                  className="h-14 w-20 shrink-0 rounded-md bg-zinc-100 bg-cover bg-center dark:bg-zinc-800"
                  style={p.image ? { backgroundImage: `url(${p.image})` } : undefined}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.category && <Badge>{p.category}</Badge>}
                    <Badge tone={p.published ? "emerald" : "zinc"}>
                      {p.published ? "Опубликован" : "Черновик"}
                    </Badge>
                    {p.pinned && <Badge tone="amber">Закреп</Badge>}
                  </div>
                  <div className="mt-1 line-clamp-1 text-sm font-medium">{p.title}</div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                    {new Date(p.createdAt).toLocaleString("ru-RU")} · ♥ {p.likes} · 💬 {p.commentsCount}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => pinMut.mutate(p)}
                    className={`rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      p.pinned ? "text-amber-500" : "text-zinc-400"
                    }`}
                    title={p.pinned ? "Открепить" : "Закрепить"}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => publishMut.mutate(p)}
                    className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {p.published ? "Снять" : "Опубликовать"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(p)}
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

      {editing && (
        <NewsEditor
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          open
          title="Удалить новость?"
          message={`«${toDelete.title}» пропадёт из ленты.`}
          confirmLabel="Удалить"
          danger
          onConfirm={() => delMut.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

const CATEGORIES = ["", "Анонсы", "Мото", "Клуб", "Гонки", "Индустрия"];

function NewsEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: AdminNewsItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !initial;
  const [form, setForm] = useState<AdminNewsInput>({
    category: initial?.category ?? "",
    title: initial?.title ?? "",
    text: initial?.text ?? "",
    imageUrl: initial?.image ?? "",
    published: initial?.published ?? false,
    pinned: initial?.pinned ?? false,
  });
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setF = <K extends keyof AdminNewsInput>(k: K, v: AdminNewsInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: async () => {
      setErr(null);
      return isNew ? createAdminNews(form) : patchAdminNews(initial!.id, form);
    },
    onSuccess: () => {
      toast.success(isNew ? "Пост создан" : "Сохранено");
      onSaved();
    },
    onError: (e) => {
      const m = apiErr(e, "Не получилось сохранить");
      setErr(m);
      toast.error(m);
    },
  });

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Файл больше 5 МБ");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFileToS3(f, "shop", "news");
      setF("imageUrl", url);
    } catch (er) {
      toast.error(apiErr(er, "Не получилось загрузить"));
    } finally {
      setUploading(false);
    }
  }

  const canSave = form.title.trim().length > 0;

  return (
    <Modal
      open
      size="lg"
      title={isNew ? "Новая новость" : "Редактировать новость"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>
            Отмена
          </Btn>
          <Btn
            onClick={() => saveMut.mutate()}
            disabled={!canSave || saveMut.isPending || uploading}
          >
            {saveMut.isPending ? "Сохранение…" : "Сохранить"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        {err && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-950 dark:bg-rose-950/40 dark:text-rose-300">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Категория" hint="Короткая метка над заголовком (можно пусто).">
            <Select value={form.category ?? ""} onChange={(e) => setF("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c || "— без категории —"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Картинка">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm hover:border-primary dark:border-zinc-700 dark:bg-zinc-900">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {form.imageUrl ? "Заменить" : "Загрузить"}
                <input
                  type="file"
                  accept="image/jpeg,image/webp,image/png"
                  className="hidden"
                  onChange={onPickFile}
                  disabled={uploading}
                />
              </label>
              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => setF("imageUrl", "")}
                  className="text-xs text-zinc-500 hover:text-rose-500"
                >
                  Убрать
                </button>
              )}
            </div>
            {form.imageUrl && (
              <div
                className="mt-2 aspect-[16/9] w-full rounded-md bg-zinc-100 bg-cover bg-center dark:bg-zinc-800"
                style={{ backgroundImage: `url(${form.imageUrl})` }}
              />
            )}
          </Field>
        </div>

        <Field label="Заголовок">
          <TextInput
            value={form.title}
            onChange={(e) => setF("title", e.target.value)}
            placeholder="Что произошло"
            maxLength={240}
          />
        </Field>

        <Field label="Текст" hint="Основной текст новости. Markdown/HTML не поддерживаются.">
          <TextArea
            rows={8}
            value={form.text ?? ""}
            onChange={(e) => setF("text", e.target.value)}
            maxLength={20000}
          />
        </Field>

        <div className="flex flex-wrap gap-6">
          <Switch
            label="Опубликовать"
            checked={!!form.published}
            onChange={(v) => setF("published", v)}
          />
          <Switch
            label="Закрепить сверху"
            checked={!!form.pinned}
            onChange={(v) => setF("pinned", v)}
          />
        </div>

        <div className="rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Комментарии к новостям сейчас — заглушка (в клубе показывается пустой шит). Бэкенд комментариев подключим позже.
        </div>
      </div>
    </Modal>
  );
}
