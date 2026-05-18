import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit, Trash2, Star, Image as ImageIcon } from "lucide-react";
import {
  PageHeader,
  Panel,
  Btn,
  DataTable,
  Badge,
  TextInput,
  TextArea,
  Select,
  Field,
  PanelHeader,
  Modal,
  ConfirmModal,
} from "@/components/admin/ui";
import { ImageUploader } from "./admin.raffles";
import { PRODUCTS } from "@/data/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/shop")({
  component: ShopPage,
});

type Tab = "products" | "categories" | "showcase";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  sub?: string;
  image: string;
  description?: string;
  status: "active" | "draft" | "archived";
};

const CATEGORIES_SEED = [
  { id: "apparel", name: "Одежда", subs: ["Худи", "Футболки", "Куртки"] },
  { id: "gear", name: "Экипировка", subs: ["Перчатки", "Шлемы", "Защита"] },
  { id: "accessories", name: "Аксессуары", subs: ["Брелоки", "Стикеры", "Кепки"] },
];

function ShopPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>(
    PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: 12,
      category: p.category,
      sub: p.sub,
      image: p.image,
      status: "active" as const,
    })),
  );
  const [editing, setEditing] = useState<Product | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [del, setDel] = useState<Product | null>(null);
  const [categories, setCategories] = useState(CATEGORIES_SEED);
  const [catOpen, setCatOpen] = useState(false);

  const openNew = () => {
    setEditing({
      id: "",
      name: "",
      price: 0,
      stock: 0,
      category: "apparel",
      image: "",
      status: "draft",
    });
    setProductOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Магазин"
        description="Товары, категории и витрина на главной"
        actions={
          tab === "products" ? (
            <Btn variant="primary" onClick={openNew}>
              <Plus className="h-4 w-4" /> Новый товар
            </Btn>
          ) : null
        }
      />

      <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(["products", "categories", "showcase"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {t === "products" ? "Товары" : t === "categories" ? "Категории" : "Витрина"}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <ProductsTab
          products={products}
          onEdit={(p) => {
            setEditing(p);
            setProductOpen(true);
          }}
          onDelete={setDel}
        />
      )}
      {tab === "categories" && (
        <CategoriesTab categories={categories} onNew={() => setCatOpen(true)} />
      )}
      {tab === "showcase" && <ShowcaseTab products={products} />}

      {editing && (
        <ProductModal
          open={productOpen}
          initial={editing}
          categories={categories}
          onClose={() => setProductOpen(false)}
          onSave={(p) => {
            if (p.id) setProducts((l) => l.map((x) => (x.id === p.id ? p : x)));
            else setProducts((l) => [{ ...p, id: String(Date.now()) }, ...l]);
            setProductOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && setProducts((l) => l.filter((x) => x.id !== del.id))}
        title="Удалить товар?"
        message={`«${del?.name}» будет удалён.`}
      />

      <CategoryModal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        onSave={(c) => {
          setCategories((l) => [...l, c]);
          setCatOpen(false);
        }}
      />
    </div>
  );
}

function ProductsTab({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="mb-3 flex gap-2">
        <TextInput
          placeholder="Поиск товара…"
          className="max-w-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Panel>
        <DataTable
          headers={["Товар", "Категория", "Цена", "Остаток", "Статус", ""]}
          rows={filtered.map((p) => [
            <div className="flex items-center gap-2">
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-9 w-9 rounded object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800">
                  <ImageIcon className="h-4 w-4 text-zinc-400" />
                </div>
              )}
              <span className="font-medium">{p.name}</span>
            </div>,
            <span className="text-zinc-500 dark:text-zinc-400">
              {p.category} / {p.sub ?? "—"}
            </span>,
            `${p.price.toLocaleString("ru-RU")} ₽`,
            p.stock,
            <Badge tone={p.status === "active" ? "emerald" : p.status === "draft" ? "zinc" : "rose"}>
              {p.status === "active" ? "В продаже" : p.status === "draft" ? "Черновик" : "Архив"}
            </Badge>,
            <div className="flex gap-1">
              <Btn variant="ghost" onClick={() => onEdit(p)}>
                <Edit className="h-3.5 w-3.5" />
              </Btn>
              <Btn variant="ghost" onClick={() => onDelete(p)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>,
          ])}
        />
      </Panel>
    </>
  );
}

function CategoriesTab({
  categories,
  onNew,
}: {
  categories: typeof CATEGORIES_SEED;
  onNew: () => void;
}) {
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Категории и подкатегории</h3>
        <Btn variant="primary" onClick={onNew}>
          <Plus className="h-4 w-4" /> Категория
        </Btn>
      </PanelHeader>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {categories.map((c) => (
          <div key={c.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{c.name}</div>
              <div className="flex gap-1">
                <Btn variant="ghost">
                  <Edit className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost">
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.subs.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
              <Btn variant="ghost" className="h-6 px-2 text-xs">
                + подкатегория
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ShowcaseTab({ products }: { products: Product[] }) {
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Товары на главной (до 6)</h3>
        <Btn variant="primary">
          <Plus className="h-4 w-4" /> Добавить
        </Btn>
      </PanelHeader>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.slice(0, 3).map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {i + 1}
            </div>
            <img src={p.image} alt={p.name} className="h-12 w-12 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.name}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {p.price.toLocaleString("ru-RU")} ₽
              </div>
            </div>
            <Btn variant="ghost">
              <Trash2 className="h-3.5 w-3.5" />
            </Btn>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <Star className="mr-1 inline h-3 w-3" /> Перетаскивание для сортировки появится со связью с БД
      </div>
    </Panel>
  );
}

function ProductModal({
  open,
  initial,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Product;
  categories: typeof CATEGORIES_SEED;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [p, setP] = useState<Product>(initial);
  const subs = categories.find((c) => c.id === p.category)?.subs ?? [];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать товар" : "Новый товар"}
      size="lg"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={() => onSave(p)}>
            Сохранить
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Название">
          <TextInput value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </Field>
        <Field label="Описание">
          <TextArea
            rows={3}
            value={p.description ?? ""}
            onChange={(e) => setP({ ...p, description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Цена (₽)">
            <TextInput
              type="number"
              value={p.price}
              onChange={(e) => setP({ ...p, price: Number(e.target.value) })}
            />
          </Field>
          <Field label="Остаток">
            <TextInput
              type="number"
              value={p.stock}
              onChange={(e) => setP({ ...p, stock: Number(e.target.value) })}
            />
          </Field>
          <Field label="Статус">
            <Select
              value={p.status}
              onChange={(e) => setP({ ...p, status: e.target.value as Product["status"] })}
            >
              <option value="draft">Черновик</option>
              <option value="active">В продаже</option>
              <option value="archived">Архив</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Категория">
            <Select
              value={p.category}
              onChange={(e) => setP({ ...p, category: e.target.value, sub: undefined })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Подкатегория">
            <Select value={p.sub ?? ""} onChange={(e) => setP({ ...p, sub: e.target.value || undefined })}>
              <option value="">—</option>
              {subs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Изображение (URL)">
          <TextInput value={p.image} onChange={(e) => setP({ ...p, image: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function CategoryModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (c: { id: string; name: string; subs: string[] }) => void;
}) {
  const [name, setName] = useState("");
  const [subs, setSubs] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новая категория"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn
            variant="primary"
            onClick={() =>
              onSave({
                id: name.toLowerCase().replace(/\s+/g, "-"),
                name,
                subs: subs.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
          >
            Создать
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Название">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Подкатегории (через запятую)" hint="Можно добавить позже">
          <TextInput value={subs} onChange={(e) => setSubs(e.target.value)} placeholder="Худи, Футболки" />
        </Field>
      </div>
    </Modal>
  );
}
