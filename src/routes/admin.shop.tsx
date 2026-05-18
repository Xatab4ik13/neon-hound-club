import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { PageHeader, Panel, Btn, DataTable, Badge, TextInput, PanelHeader } from "@/components/admin/ui";
import { PRODUCTS } from "@/data/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/shop")({
  component: ShopPage,
});

type Tab = "products" | "categories" | "showcase";

const CATEGORIES = [
  { id: "apparel", name: "Одежда", subs: ["Худи", "Футболки", "Куртки"] },
  { id: "gear", name: "Экипировка", subs: ["Перчатки", "Шлемы", "Защита"] },
  { id: "accessories", name: "Аксессуары", subs: ["Брелоки", "Стикеры", "Кепки"] },
];

function ShopPage() {
  const [tab, setTab] = useState<Tab>("products");

  return (
    <div>
      <PageHeader
        title="Магазин"
        description="Товары, категории и витрина на главной"
        actions={
          tab === "products" ? (
            <Btn variant="primary">
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

      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "showcase" && <ShowcaseTab />}
    </div>
  );
}

function ProductsTab() {
  return (
    <>
      <div className="mb-3 flex gap-2">
        <TextInput placeholder="Поиск товара…" className="max-w-sm" />
      </div>
      <Panel>
        <DataTable
          headers={["Товар", "Категория", "Цена", "Остаток", "Статус", ""]}
          rows={PRODUCTS.map((p) => [
            <div className="flex items-center gap-2">
              <img src={p.image} alt={p.name} className="h-9 w-9 rounded object-cover" />
              <span className="font-medium">{p.name}</span>
            </div>,
            <span className="text-zinc-500 dark:text-zinc-400">
              {p.category} / {p.sub ?? "—"}
            </span>,
            `${p.price.toLocaleString("ru-RU")} ₽`,
            "12",
            <Badge tone="emerald">В продаже</Badge>,
            <div className="flex gap-1">
              <Btn variant="ghost"><Edit className="h-3.5 w-3.5" /></Btn>
              <Btn variant="ghost"><Trash2 className="h-3.5 w-3.5" /></Btn>
            </div>,
          ])}
        />
      </Panel>
    </>
  );
}

function CategoriesTab() {
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Категории и подкатегории</h3>
        <Btn variant="primary"><Plus className="h-4 w-4" /> Категория</Btn>
      </PanelHeader>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {CATEGORIES.map((c) => (
          <div key={c.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{c.name}</div>
              <div className="flex gap-1">
                <Btn variant="ghost"><Edit className="h-3.5 w-3.5" /></Btn>
                <Btn variant="ghost"><Trash2 className="h-3.5 w-3.5" /></Btn>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.subs.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
              <Btn variant="ghost" className="h-6 px-2 text-xs">+ подкатегория</Btn>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ShowcaseTab() {
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Товары на главной (до 6)</h3>
        <Btn variant="primary"><Plus className="h-4 w-4" /> Добавить</Btn>
      </PanelHeader>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.slice(0, 3).map((p, i) => (
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
            <Btn variant="ghost"><Trash2 className="h-3.5 w-3.5" /></Btn>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <Star className="mr-1 inline h-3 w-3" /> Перетаскивание для сортировки появится со связью с БД
      </div>
    </Panel>
  );
}
