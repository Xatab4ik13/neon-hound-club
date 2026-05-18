import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
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
import { NEWS } from "@/data/news";

export const Route = createFileRoute("/admin/news")({
  component: NewsPage,
});

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  tag: string;
  date: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  status: "draft" | "published";
};

const SEED: Article[] = NEWS.map((n, i) => ({
  id: String(i + 1),
  title: n.title,
  slug: n.slug ?? `article-${i + 1}`,
  excerpt: n.excerpt ?? "",
  body: "",
  tag: n.tag ?? "Клуб",
  date: n.date,
  metaTitle: n.title,
  metaDescription: n.excerpt ?? "",
  ogImage: "",
  status: "published",
}));

function NewsPage() {
  const [list, setList] = useState<Article[]>(SEED);
  const [editing, setEditing] = useState<Article | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Article | null>(null);

  return (
    <div>
      <PageHeader
        title="Новости"
        description="SEO-статьи для продвижения. Перед публикацией заполните meta и og:image."
        actions={
          <Btn
            variant="primary"
            onClick={() => {
              setEditing({
                id: "",
                title: "",
                slug: "",
                excerpt: "",
                body: "",
                tag: "Клуб",
                date: new Date().toISOString().slice(0, 10),
                metaTitle: "",
                metaDescription: "",
                ogImage: "",
                status: "draft",
              });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Новая статья
          </Btn>
        }
      />

      <div className="mb-3 flex gap-2">
        <TextInput placeholder="Поиск по заголовку…" className="max-w-sm" />
      </div>

      <Panel>
        <DataTable
          headers={["Заголовок", "Тег", "Дата", "Статус", ""]}
          rows={list.map((n) => [
            <div>
              <div className="font-medium">{n.title}</div>
              <div className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">{n.excerpt}</div>
            </div>,
            <Badge tone="blue">{n.tag}</Badge>,
            new Date(n.date).toLocaleDateString("ru-RU"),
            <Badge tone={n.status === "published" ? "emerald" : "zinc"}>
              {n.status === "published" ? "Опубликована" : "Черновик"}
            </Badge>,
            <div className="flex gap-1">
              <Btn
                variant="ghost"
                onClick={() => {
                  setEditing(n);
                  setOpen(true);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Btn>
              <Btn variant="ghost" onClick={() => setDel(n)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>,
          ])}
        />
      </Panel>

      {editing && (
        <ArticleModal
          open={open}
          initial={editing}
          onClose={() => setOpen(false)}
          onSave={(a) => {
            if (a.id) setList((l) => l.map((x) => (x.id === a.id ? a : x)));
            else setList((l) => [{ ...a, id: String(Date.now()) }, ...l]);
            setOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && setList((l) => l.filter((x) => x.id !== del.id))}
        title="Удалить статью?"
        message={`«${del?.title}» будет удалена.`}
      />
    </div>
  );
}

function ArticleModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Article;
  onClose: () => void;
  onSave: (a: Article) => void;
}) {
  const [a, setA] = useState<Article>(initial);
  const [tab, setTab] = useState<"content" | "seo">("content");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать статью" : "Новая статья"}
      size="xl"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => onSave({ ...a, status: "draft" })}>Сохранить черновик</Btn>
          <Btn variant="primary" onClick={() => onSave({ ...a, status: "published" })}>
            Опубликовать
          </Btn>
        </>
      }
    >
      <div className="mb-4 inline-flex rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
        {(["content", "seo"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              "rounded px-3 py-1 text-xs font-medium " +
              (tab === t
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400")
            }
          >
            {t === "content" ? "Контент" : "SEO"}
          </button>
        ))}
      </div>

      {tab === "content" ? (
        <div className="space-y-3">
          <Field label="Заголовок">
            <TextInput value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug (URL)">
              <TextInput value={a.slug} onChange={(e) => setA({ ...a, slug: e.target.value })} />
            </Field>
            <Field label="Тег">
              <Select value={a.tag} onChange={(e) => setA({ ...a, tag: e.target.value })}>
                <option>Клуб</option>
                <option>Мерч</option>
                <option>Школа</option>
                <option>Розыгрыш</option>
                <option>Колонка</option>
              </Select>
            </Field>
          </div>
          <Field label="Лид (excerpt)">
            <TextArea rows={2} value={a.excerpt} onChange={(e) => setA({ ...a, excerpt: e.target.value })} />
          </Field>
          <Field label="Текст (markdown)">
            <TextArea rows={10} value={a.body} onChange={(e) => setA({ ...a, body: e.target.value })} />
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Meta title" hint="До 60 символов">
            <TextInput
              value={a.metaTitle}
              onChange={(e) => setA({ ...a, metaTitle: e.target.value })}
            />
          </Field>
          <Field label="Meta description" hint="До 160 символов">
            <TextArea
              rows={3}
              value={a.metaDescription}
              onChange={(e) => setA({ ...a, metaDescription: e.target.value })}
            />
          </Field>
          <Field label="og:image (URL)">
            <TextInput value={a.ogImage} onChange={(e) => setA({ ...a, ogImage: e.target.value })} />
          </Field>
        </div>
      )}
    </Modal>
  );
}
