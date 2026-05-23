import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import {
  PageHeader,
  Panel,
  Btn,
  DataTable,
  Badge,
  TextInput,
  TextArea,
  Field,
  Select,
  Modal,
  ConfirmModal,
} from "@/components/admin/ui";
import {
  fetchAdminNews,
  createAdminNews,
  updateAdminNews,
  deleteAdminNews,
  type AdminNewsItem,
} from "@/lib/admin-queries";
import { hhToast as toast } from "@/lib/hh-toast";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin/news")({
  component: NewsPage,
});

const TAGS = ["Клуб", "Мерч", "Hell Pass", "Школа"] as const;

type FormState = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string;
  coverUrl: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  status: "draft" | "published";
};

const EMPTY: FormState = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  tag: "Клуб",
  coverUrl: "",
  metaTitle: "",
  metaDescription: "",
  ogImage: "",
  status: "draft",
};

function NewsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "news"],
    queryFn: () => fetchAdminNews({ status: "all" }),
  });
  const items = data?.items ?? [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [del, setDel] = useState<AdminNewsItem | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: Partial<AdminNewsItem>) => createAdminNews(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "news"] });
      setOpen(false);
      toast.success("Новость создана");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AdminNewsItem> }) =>
      updateAdminNews(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "news"] });
      setOpen(false);
      toast.success("Сохранено");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminNews(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "news"] });
      setDel(null);
      toast.success("Удалено");
    },
  });

  const editing = !!form.id;

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(a: AdminNewsItem) {
    setForm({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      body: a.body,
      tag: a.tag,
      coverUrl: a.coverUrl ?? "",
      metaTitle: a.metaTitle,
      metaDescription: a.metaDescription,
      ogImage: a.ogImage ?? "",
      status: a.status,
    });
    setOpen(true);
  }

  function save() {
    const payload: Partial<AdminNewsItem> = {
      slug: form.slug,
      title: form.title,
      excerpt: form.excerpt,
      body: form.body,
      tag: form.tag,
      coverUrl: form.coverUrl || null,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      ogImage: form.ogImage || null,
      status: form.status,
    };
    if (editing) updateMut.mutate({ id: form.id!, patch: payload });
    else createMut.mutate(payload);
  }

  const rows = useMemo(
    () =>
      items.map((a) => [
        <span className="font-medium">{a.title}</span>,
        <code className="text-xs text-zinc-500">{a.slug}</code>,
        <Badge tone="zinc">{a.tag}</Badge>,
        <Badge tone={a.status === "published" ? "emerald" : "amber"}>
          {a.status === "published" ? "Опубликовано" : "Черновик"}
        </Badge>,
        a.publishedAt
          ? new Date(a.publishedAt).toLocaleDateString("ru-RU")
          : new Date(a.createdAt).toLocaleDateString("ru-RU"),
        <div className="flex justify-end gap-2">
          <Btn onClick={() => openEdit(a)}>
            <Edit className="h-4 w-4" />
          </Btn>
          <Btn variant="danger" onClick={() => setDel(a)}>
            <Trash2 className="h-4 w-4" />
          </Btn>
        </div>,
      ]),
    [items],
  );

  return (
    <div>
      <PageHeader
        title="Новости"
        description="CRUD клубных новостей"
        actions={
          <Btn variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Новость
          </Btn>
        }
      />

      <Panel>
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">Пока нет ни одной новости</div>
        ) : (
          <DataTable
            headers={["Заголовок", "Slug", "Тег", "Статус", "Дата", ""]}
            rows={rows}
          />
        )}
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Редактировать новость" : "Новая новость"}
        footer={
          <>
            <Btn onClick={() => setOpen(false)}>Отмена</Btn>
            <Btn
              variant="primary"
              onClick={save}
              disabled={createMut.isPending || updateMut.isPending || !form.title || !form.slug}
            >
              {createMut.isPending || updateMut.isPending ? "Сохраняем…" : "Сохранить"}
            </Btn>
          </>
        }
      >
        <Field label="Заголовок">
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Slug" hint="Только латиница, цифры, дефис. От 2 до 158 символов.">
          <TextInput value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тег">
            <Select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
              {TAGS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Статус">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })}
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликовано</option>
            </Select>
          </Field>
        </div>
        <Field label="Обложка (URL)">
          <TextInput value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
        </Field>
        <Field label="Краткое описание">
          <TextArea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        </Field>
        <Field label="Текст (markdown)">
          <TextArea rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>
        <Field label="SEO: meta title">
          <TextInput value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
        </Field>
        <Field label="SEO: meta description">
          <TextArea value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
        </Field>
        <Field label="OG image (URL)">
          <TextInput value={form.ogImage} onChange={(e) => setForm({ ...form, ogImage: e.target.value })} />
        </Field>
      </Modal>

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && deleteMut.mutate(del.id)}
        title="Удалить новость?"
        message={del ? `«${del.title}» будет удалена безвозвратно.` : ""}
        confirmLabel="Удалить"
        danger
      />
    </div>
  );
}
