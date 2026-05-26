// Админка магазина. 4 вкладки:
//   • Товары     — CRUD с типами: physical / digital / preorder
//   • Категории  — категории + подкатегории, CRUD
//   • Витрина    — ручная подборка до 6 товаров на главную/клуб
//   • Заказы     — список + смена статуса + СДЭК-трек
//
// Подключено к бэку через src/lib/admin-queries.ts.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Receipt,
  FolderTree,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { hhToast as toast } from "@/lib/hh-toast";
import {
  PageHeader,
  Panel,
  Btn,
  Badge,
  TextInput,
  TextArea,
  Select,
  Field,
  Modal,
  ConfirmModal,
  Drawer,
  DataTable,
} from "@/components/admin/ui";
import {
  adminQk,
  fetchAdminShopProducts,
  createAdminProduct,
  patchAdminProduct,
  deleteAdminProduct,
  fetchAdminOrders,
  fetchAdminOrder,
  patchAdminOrder,
  fetchAdminShopCategories,
  createAdminShopCategory,
  patchAdminShopCategory,
  deleteAdminShopCategory,
  createAdminShopSubcategory,
  patchAdminShopSubcategory,
  deleteAdminShopSubcategory,
  fetchAdminShopShowcase,
  putAdminShopShowcase,
  type CreateProductInput,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ProductKind,
  ShopCategoryWithSubs,
  ShopOrder,
  ShopOrderStatus,
  ShopProduct,
} from "@/lib/queries";

// Кириллица → латиница для slug-ов
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const Route = createFileRoute("/admin/shop")({
  component: ShopPage,
});

type Tab = "products" | "categories" | "showcase" | "orders";

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "products", label: "Товары", icon: Package },
  { key: "categories", label: "Категории", icon: FolderTree },
  { key: "showcase", label: "Витрина", icon: Star },
  { key: "orders", label: "Заказы", icon: Receipt },
];

const KIND_LABEL: Record<ProductKind, string> = {
  physical: "Физический",
  digital: "Цифровой",
  preorder: "Предзаказ",
};

const KIND_TONE: Record<ProductKind, "zinc" | "emerald" | "amber" | "blue"> = {
  physical: "zinc",
  digital: "emerald",
  preorder: "amber",
};

const STATUS_LABEL: Record<ShopOrderStatus, string> = {
  pending_payment: "Ждёт оплаты",
  paid: "Оплачен",
  shipped: "Отправлен",
  delivered: "Получен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

const STATUS_TONE: Record<ShopOrderStatus, "zinc" | "emerald" | "amber" | "rose" | "blue"> = {
  pending_payment: "amber",
  paid: "blue",
  shipped: "blue",
  delivered: "emerald",
  cancelled: "rose",
  refunded: "rose",
};

function ShopPage() {
  const [tab, setTab] = useState<Tab>("products");
  return (
    <div>
      <PageHeader
        title="Магазин"
        description="Товары, категории, витрина и заказы — живые данные с бэка."
      />

      <div className="mb-4 inline-flex flex-wrap rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "showcase" && <ShowcaseTab />}
      {tab === "orders" && <OrdersTab />}
    </div>
  );
}

// ============================================================================
// PRODUCTS
// ============================================================================

function emptyProduct(): CreateProductInput {
  return {
    slug: "",
    title: "",
    description: "",
    priceRub: 0,
    bonusTickets: 0,
    images: [],
    stock: null,
    active: true,
    kind: "physical",
    categoryId: null,
    subcategoryId: null,
    digitalFileUrl: null,
    digitalFileName: null,
    preorderExpectedAt: null,
    shippingInfo: "",
    returnPolicy: "",
    sizes: [],
  };
}

function ProductsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: adminQk.shopProducts,
    queryFn: fetchAdminShopProducts,
  });
  const { data: catsData } = useQuery({
    queryKey: adminQk.shopCategories,
    queryFn: fetchAdminShopCategories,
  });

  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [del, setDel] = useState<ShopProduct | null>(null);
  const [kindFilter, setKindFilter] = useState<ProductKind | "all">("all");

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminProduct(id),
    onSuccess: () => {
      toast.success("Товар скрыт");
      qc.invalidateQueries({ queryKey: adminQk.shopProducts });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  const cats = catsData?.items ?? [];
  const items = (data?.items ?? []).filter((p) => kindFilter === "all" || p.kind === kindFilter);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(["all", "physical", "digital", "preorder"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                kindFilter === k
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
              )}
            >
              {k === "all" ? "Все" : KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <Btn variant="primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Новый товар
        </Btn>
      </div>

      <Panel>
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Товаров пока нет</div>
        ) : (
          <DataTable
            headers={["Товар", "Тип", "Категория", "Цена", "Билетов", "Остаток", "Статус", ""]}
            rows={items.map((p) => {
              const cat = cats.find((c) => c.id === p.categoryId);
              const sub = cat?.subs.find((s) => s.id === p.subcategoryId);
              return [
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="flex items-center gap-2 text-left hover:underline"
                >
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="h-9 w-9 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded bg-zinc-100 dark:bg-zinc-800" />
                  )}
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <code className="text-[11px] text-zinc-500">{p.slug}</code>
                  </div>
                </button>,
                <Badge tone={KIND_TONE[p.kind]}>{KIND_LABEL[p.kind]}</Badge>,
                cat ? (
                  <div className="text-xs">
                    {cat.name}
                    {sub && <span className="text-zinc-500"> / {sub.name}</span>}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                ),
                `${p.priceRub.toLocaleString("ru-RU")} ₽`,
                p.bonusTickets > 0 ? `+${p.bonusTickets} 🎟` : "—",
                p.kind === "digital" ? "∞" : p.stock === null ? "∞" : p.stock,
                <Badge tone={p.active ? "emerald" : "zinc"}>
                  {p.active ? "Активен" : "Скрыт"}
                </Badge>,
                <div className="flex gap-1">
                  <Btn variant="ghost" onClick={() => setEditing(p)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Btn>
                  <Btn variant="ghost" onClick={() => setDel(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                </div>,
              ];
            })}
          />
        )}
      </Panel>

      {newOpen && (
        <ProductModal
          mode="create"
          initial={emptyProduct()}
          categories={cats}
          onClose={() => setNewOpen(false)}
          onDone={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: adminQk.shopProducts });
          }}
        />
      )}
      {editing && (
        <ProductModal
          mode="edit"
          productId={editing.id}
          categories={cats}
          initial={{
            slug: editing.slug,
            title: editing.title,
            description: editing.description,
            priceRub: editing.priceRub,
            bonusTickets: editing.bonusTickets,
            images: editing.images,
            stock: editing.stock,
            active: editing.active,
            kind: editing.kind,
            categoryId: editing.categoryId,
            subcategoryId: editing.subcategoryId,
            digitalFileUrl: editing.digitalFileUrl,
            digitalFileName: editing.digitalFileName,
            preorderExpectedAt: editing.preorderExpectedAt,
            shippingInfo: editing.shippingInfo ?? "",
            returnPolicy: editing.returnPolicy ?? "",
            sizes: editing.sizes ?? [],
          }}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: adminQk.shopProducts });
          }}
        />
      )}

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && deleteMut.mutate(del.id)}
        title="Скрыть товар?"
        message={`«${del?.title}» будет скрыт из каталога (мягкое удаление — заказы не сломаются).`}
      />
    </>
  );
}

function ProductModal({
  mode,
  productId,
  initial,
  categories,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  productId?: string;
  initial: CreateProductInput;
  categories: ShopCategoryWithSubs[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [p, setP] = useState<CreateProductInput>(initial);
  const [images, setImages] = useState<string[]>(initial.images ?? []);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const handleUpload = async (file: File, replaceIdx?: number) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Файл больше 8 МБ");
      return;
    }
    const idx = replaceIdx ?? images.length;
    setUploadingIdx(idx);
    try {
      const { uploadFileToS3 } = await import("@/lib/garage-api");
      const url = await uploadFileToS3(file, "shop");
      setImages((prev) => {
        const next = [...prev];
        if (replaceIdx !== undefined) next[replaceIdx] = url;
        else next.push(url);
        return next.slice(0, 5);
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не загрузилось");
    } finally {
      setUploadingIdx(null);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };
  const [unlimited, setUnlimited] = useState(initial.stock === null);

  // ISO datetime <-> input[type=datetime-local] (yyyy-MM-ddTHH:mm)
  const preorderLocal = useMemo(() => {
    if (!p.preorderExpectedAt) return "";
    const d = new Date(p.preorderExpectedAt);
    if (Number.isNaN(d.getTime())) return "";
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
  }, [p.preorderExpectedAt]);

  const cat = categories.find((c) => c.id === p.categoryId);
  const subs = cat?.subs ?? [];

  const save = useMutation({
    mutationFn: () => {
      const payload: CreateProductInput = {
        ...p,
        images: images.filter(Boolean).slice(0, 5),
        stock: p.kind === "digital" ? null : unlimited ? null : Math.max(0, Number(p.stock) || 0),
        categoryId: p.categoryId || null,
        subcategoryId: p.subcategoryId || null,
        digitalFileUrl: p.kind === "digital" ? p.digitalFileUrl || null : null,
        digitalFileName: p.kind === "digital" ? p.digitalFileName || null : null,
        preorderExpectedAt: p.kind === "preorder" ? p.preorderExpectedAt || null : null,
        shippingInfo: (p.shippingInfo ?? "").trim(),
        returnPolicy: (p.returnPolicy ?? "").trim(),
        sizes: (p.sizes ?? []).map((s) => s.trim()).filter(Boolean),
      };
      return mode === "create"
        ? createAdminProduct(payload)
        : patchAdminProduct(productId!, payload);
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Товар создан" : "Сохранено");
      onDone();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "Новый товар" : "Редактировать товар"}
      size="lg"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Сохраняем…" : "Сохранить"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Slug" hint="Латиница, цифры, дефис. Не менять у существующих.">
            <TextInput
              value={p.slug}
              onChange={(e) =>
                setP({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
              }
              placeholder="hoodie-black"
              disabled={mode === "edit"}
            />
          </Field>
          <Field label="Название">
            <TextInput value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} />
          </Field>
        </div>

        <Field label="Описание">
          <TextArea
            rows={4}
            value={p.description ?? ""}
            onChange={(e) => setP({ ...p, description: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Тип товара">
            <Select
              value={p.kind ?? "physical"}
              onChange={(e) => setP({ ...p, kind: e.target.value as ProductKind })}
            >
              <option value="physical">Физический</option>
              <option value="digital">Цифровой (файл)</option>
              <option value="preorder">Предзаказ</option>
            </Select>
          </Field>
          <Field label="Категория">
            <Select
              value={p.categoryId ?? ""}
              onChange={(e) =>
                setP({
                  ...p,
                  categoryId: e.target.value || null,
                  subcategoryId: null,
                })
              }
            >
              <option value="">— Без категории —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Подкатегория">
            <Select
              value={p.subcategoryId ?? ""}
              onChange={(e) => setP({ ...p, subcategoryId: e.target.value || null })}
              disabled={!p.categoryId || subs.length === 0}
            >
              <option value="">— Без подкатегории —</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Цена (₽)">
            <TextInput
              type="number"
              min={0}
              value={p.priceRub}
              onChange={(e) => setP({ ...p, priceRub: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
          <Field label="Билетов за покупку" hint="Сколько 🎟 начислится при оплате.">
            <TextInput
              type="number"
              min={0}
              value={p.bonusTickets ?? 0}
              onChange={(e) =>
                setP({ ...p, bonusTickets: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </Field>
          <Field label="Статус">
            <Select
              value={p.active ? "1" : "0"}
              onChange={(e) => setP({ ...p, active: e.target.value === "1" })}
            >
              <option value="1">Активен</option>
              <option value="0">Скрыт</option>
            </Select>
          </Field>
        </div>

        {p.kind !== "digital" && (
          <Field label="Остаток на складе">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={unlimited}
                  onChange={(e) => setUnlimited(e.target.checked)}
                />
                Без учёта остатков (∞)
              </label>
              {!unlimited && (
                <TextInput
                  type="number"
                  min={0}
                  value={p.stock ?? 0}
                  onChange={(e) =>
                    setP({ ...p, stock: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="max-w-[140px]"
                />
              )}
            </div>
          </Field>
        )}

        {p.kind === "digital" && (
          <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
              Цифровой товар
            </div>
            <Field
              label="Ссылка на файл (PDF / JPG / ZIP)"
              hint="После оплаты покупатель увидит её в своём кабинете."
            >
              <TextInput
                value={p.digitalFileUrl ?? ""}
                onChange={(e) => setP({ ...p, digitalFileUrl: e.target.value })}
                placeholder="https://cdn.hhr.pro/digital/manual.pdf"
              />
            </Field>
            <Field label="Имя файла (как показывать покупателю)">
              <TextInput
                value={p.digitalFileName ?? ""}
                onChange={(e) => setP({ ...p, digitalFileName: e.target.value })}
                placeholder="manual.pdf"
              />
            </Field>
          </div>
        )}

        {p.kind === "preorder" && (
          <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
            <div className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">
              Предзаказ
            </div>
            <Field
              label="Ожидаемая дата отгрузки"
              hint="Покупатель оплачивает сразу, отгрузка с этой даты."
            >
              <TextInput
                type="datetime-local"
                value={preorderLocal}
                onChange={(e) => {
                  const v = e.target.value;
                  setP({
                    ...p,
                    preorderExpectedAt: v ? new Date(v).toISOString() : null,
                  });
                }}
              />
            </Field>
          </div>
        )}

        <Field
          label={`Фото товара (до 5, первое — обложка) — ${images.length}/5`}
          hint="JPG/PNG/WebP, до 8 МБ. Можно менять порядок стрелками."
        >
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, idx) => {
              const url = images[idx];
              const isUploading = uploadingIdx === idx;
              if (url) {
                return (
                  <div
                    key={idx}
                    className="group relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/40"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                        Обложка
                      </span>
                    )}
                    <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveImage(idx, -1)}
                          disabled={idx === 0}
                          className="grid h-6 w-6 place-items-center rounded bg-black/70 text-foreground disabled:opacity-30"
                          aria-label="Левее"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(idx, 1)}
                          disabled={idx === images.length - 1}
                          className="grid h-6 w-6 place-items-center rounded bg-black/70 text-foreground disabled:opacity-30"
                          aria-label="Правее"
                        >
                          ›
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="grid h-6 w-6 place-items-center rounded bg-red-600/90 text-white"
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              }
              if (idx > images.length) {
                return (
                  <div
                    key={idx}
                    className="aspect-square rounded-md border border-dashed border-white/5 bg-black/20"
                  />
                );
              }
              return (
                <label
                  key={idx}
                  className="grid aspect-square cursor-pointer place-items-center rounded-md border border-dashed border-white/15 bg-black/20 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {isUploading ? (
                    <span className="font-mono text-[10px] uppercase">…</span>
                  ) : (
                    <span className="flex flex-col items-center gap-1">
                      <Plus className="h-5 w-5" />
                      <span className="font-mono text-[10px] uppercase">Фото</span>
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              );
            })}
          </div>
        </Field>

        {p.kind !== "digital" && (
          <Field
            label="Размеры"
            hint="Любые значения через запятую или Enter: «S, M, L, XL», «40, 41, 42», «39-41, 42-44». Можно писать что угодно. Если пусто — селектор размера не показываем."
          >
            <SizesInput
              value={p.sizes ?? []}
              onChange={(next) => setP({ ...p, sizes: next })}
            />
          </Field>
        )}

        <Field label="Доставка" hint="Текст для аккордеона «Доставка» на карточке товара.">
          <TextArea
            rows={4}
            value={p.shippingInfo ?? ""}
            onChange={(e) => setP({ ...p, shippingInfo: e.target.value })}
            placeholder="· СДЭК и Boxberry по РФ — 2–7 дней.&#10;· Самовывоз из гаража HELLHOUND в Москве."
          />
        </Field>
      </div>
    </Modal>
  );
}

function SizesInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const commit = (raw: string) => {
    const parts = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const part of parts) {
      if (!next.includes(part) && next.length < 40) next.push(part);
    }
    onChange(next);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
      {value.map((s, i) => (
        <span
          key={`${s}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium dark:bg-zinc-800"
        >
          {s}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-zinc-500 hover:text-rose-500"
            aria-label="Удалить"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && commit(draft)}
        placeholder={value.length === 0 ? "S, M, L, XL" : ""}
        className="min-w-[80px] flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

// ============================================================================
// CATEGORIES
// ============================================================================

function CategoriesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: adminQk.shopCategories,
    queryFn: fetchAdminShopCategories,
  });

  const [editingCat, setEditingCat] = useState<ShopCategoryWithSubs | null>(null);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [delCat, setDelCat] = useState<ShopCategoryWithSubs | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [subParent, setSubParent] = useState<ShopCategoryWithSubs | null>(null);
  const [editingSub, setEditingSub] = useState<{
    categoryId: string;
    id: string;
    slug: string;
    name: string;
    sort: number;
  } | null>(null);
  const [delSubId, setDelSubId] = useState<string | null>(null);

  const deleteCatMut = useMutation({
    mutationFn: (id: string) => deleteAdminShopCategory(id),
    onSuccess: () => {
      toast.success("Категория удалена");
      qc.invalidateQueries({ queryKey: adminQk.shopCategories });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  const deleteSubMut = useMutation({
    mutationFn: (id: string) => deleteAdminShopSubcategory(id),
    onSuccess: () => {
      toast.success("Подкатегория удалена");
      qc.invalidateQueries({ queryKey: adminQk.shopCategories });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  const items = data?.items ?? [];

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Btn variant="primary" onClick={() => setNewCatOpen(true)}>
          <Plus className="h-4 w-4" /> Новая категория
        </Btn>
      </div>

      <Panel>
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Категорий пока нет. Создай первую — потом сможешь привязывать товары.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((c) => {
              const open = expanded.has(c.id);
              return (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      aria-label="Развернуть"
                    >
                      {open ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="font-medium">{c.name}</div>
                      <code className="text-xs text-zinc-500">
                        {c.slug} · sort {c.sort} · {c.subs.length} подкат.
                      </code>
                    </div>
                    <Btn variant="ghost" onClick={() => setSubParent(c)}>
                      <Plus className="h-3.5 w-3.5" /> Подкат.
                    </Btn>
                    <Btn variant="ghost" onClick={() => setEditingCat(c)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Btn>
                    <Btn variant="ghost" onClick={() => setDelCat(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Btn>
                  </div>

                  {open && c.subs.length > 0 && (
                    <ul className="mt-2 ml-8 divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {c.subs.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 py-2 text-sm">
                          <div className="flex-1">
                            <div>{s.name}</div>
                            <code className="text-xs text-zinc-500">
                              {s.slug} · sort {s.sort}
                            </code>
                          </div>
                          <Btn
                            variant="ghost"
                            onClick={() =>
                              setEditingSub({
                                categoryId: c.id,
                                id: s.id,
                                slug: s.slug,
                                name: s.name,
                                sort: s.sort,
                              })
                            }
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Btn>
                          <Btn variant="ghost" onClick={() => setDelSubId(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Btn>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {newCatOpen && (
        <CategoryModal
          mode="create"
          initial={{ slug: "", name: "", sort: 0 }}
          onClose={() => setNewCatOpen(false)}
          onDone={() => {
            setNewCatOpen(false);
            qc.invalidateQueries({ queryKey: adminQk.shopCategories });
          }}
        />
      )}
      {editingCat && (
        <CategoryModal
          mode="edit"
          categoryId={editingCat.id}
          initial={{ slug: editingCat.slug, name: editingCat.name, sort: editingCat.sort }}
          onClose={() => setEditingCat(null)}
          onDone={() => {
            setEditingCat(null);
            qc.invalidateQueries({ queryKey: adminQk.shopCategories });
          }}
        />
      )}

      {subParent && (
        <SubcategoryModal
          mode="create"
          categoryId={subParent.id}
          categoryName={subParent.name}
          initial={{ slug: "", name: "", sort: 0 }}
          onClose={() => setSubParent(null)}
          onDone={() => {
            setSubParent(null);
            qc.invalidateQueries({ queryKey: adminQk.shopCategories });
          }}
        />
      )}
      {editingSub && (
        <SubcategoryModal
          mode="edit"
          subId={editingSub.id}
          categoryId={editingSub.categoryId}
          initial={{ slug: editingSub.slug, name: editingSub.name, sort: editingSub.sort }}
          onClose={() => setEditingSub(null)}
          onDone={() => {
            setEditingSub(null);
            qc.invalidateQueries({ queryKey: adminQk.shopCategories });
          }}
        />
      )}

      <ConfirmModal
        open={!!delCat}
        onClose={() => setDelCat(null)}
        onConfirm={() => delCat && deleteCatMut.mutate(delCat.id)}
        title="Удалить категорию?"
        message={`«${delCat?.name}» и все её подкатегории будут удалены. У товаров категория обнулится.`}
      />
      <ConfirmModal
        open={!!delSubId}
        onClose={() => setDelSubId(null)}
        onConfirm={() => delSubId && deleteSubMut.mutate(delSubId)}
        title="Удалить подкатегорию?"
        message="У товаров в этой подкатегории привязка обнулится."
      />
    </>
  );
}

function CategoryModal({
  mode,
  categoryId,
  initial,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  categoryId?: string;
  initial: { slug: string; name: string; sort: number };
  onClose: () => void;
  onDone: () => void;
}) {
  const [c, setC] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const save = useMutation({
    mutationFn: () =>
      mode === "create"
        ? createAdminShopCategory(c)
        : patchAdminShopCategory(categoryId!, c),
    onSuccess: () => {
      toast.success(mode === "create" ? "Категория создана" : "Сохранено");
      onDone();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "Новая категория" : "Редактировать категорию"}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Сохраняем…" : "Сохранить"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Название">
          <TextInput
            value={c.name}
            onChange={(e) => {
              const name = e.target.value;
              setC((prev) => ({
                ...prev,
                name,
                slug: mode === "create" && !slugTouched ? slugify(name) : prev.slug,
              }));
            }}
            placeholder="Одежда"
          />
        </Field>
        <Field label="Slug" hint="Технический id для URL. Заполняется автоматически.">
          <TextInput
            value={c.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setC({ ...c, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") });
            }}
            placeholder="apparel"
            disabled={mode === "edit"}
          />
        </Field>
        <Field label="Сортировка" hint="Чем меньше — тем выше.">
          <TextInput
            type="number"
            min={0}
            value={c.sort}
            onChange={(e) => setC({ ...c, sort: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
      </div>
    </Modal>
  );
}

function SubcategoryModal({
  mode,
  subId,
  categoryId,
  categoryName,
  initial,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  subId?: string;
  categoryId: string;
  categoryName?: string;
  initial: { slug: string; name: string; sort: number };
  onClose: () => void;
  onDone: () => void;
}) {
  const [s, setS] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const save = useMutation({
    mutationFn: () =>
      mode === "create"
        ? createAdminShopSubcategory({ categoryId, ...s })
        : patchAdminShopSubcategory(subId!, s),
    onSuccess: () => {
      toast.success(mode === "create" ? "Подкатегория создана" : "Сохранено");
      onDone();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={
        mode === "create"
          ? `Новая подкатегория${categoryName ? ` в «${categoryName}»` : ""}`
          : "Редактировать подкатегорию"
      }
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Сохраняем…" : "Сохранить"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Название">
          <TextInput
            value={s.name}
            onChange={(e) => {
              const name = e.target.value;
              setS((prev) => ({
                ...prev,
                name,
                slug: mode === "create" && !slugTouched ? slugify(name) : prev.slug,
              }));
            }}
            placeholder="Худи"
          />
        </Field>
        <Field label="Slug" hint="Технический id для URL. Заполняется автоматически.">
          <TextInput
            value={s.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setS({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") });
            }}
            placeholder="hoodies"
            disabled={mode === "edit"}
          />
        </Field>
        <Field label="Сортировка">
          <TextInput
            type="number"
            min={0}
            value={s.sort}
            onChange={(e) => setS({ ...s, sort: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ============================================================================
// SHOWCASE — ручная подборка до 6 товаров
// ============================================================================

function ShowcaseTab() {
  const qc = useQueryClient();
  const { data: showcaseData, isLoading } = useQuery({
    queryKey: adminQk.shopShowcase,
    queryFn: fetchAdminShopShowcase,
  });
  const { data: productsData } = useQuery({
    queryKey: adminQk.shopProducts,
    queryFn: fetchAdminShopProducts,
  });

  const [picked, setPicked] = useState<string[]>([]);
  const initialKey = useMemo(
    () => (showcaseData?.items ?? []).map((i) => i.productId).join("|"),
    [showcaseData],
  );
  useEffect(() => {
    if (showcaseData) {
      const sorted = [...showcaseData.items].sort((a, b) => a.sort - b.sort);
      setPicked(sorted.map((i) => i.productId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const products = productsData?.items ?? [];
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const save = useMutation({
    mutationFn: () =>
      putAdminShopShowcase(picked.map((productId, i) => ({ productId, sort: i }))),
    onSuccess: () => {
      toast.success("Витрина обновлена");
      qc.invalidateQueries({ queryKey: adminQk.shopShowcase });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  function add(id: string) {
    if (picked.includes(id)) return;
    if (picked.length >= 6) {
      toast.error("Максимум 6 товаров на витрине");
      return;
    }
    setPicked([...picked, id]);
  }
  function remove(id: string) {
    setPicked(picked.filter((x) => x !== id));
  }
  function move(id: string, dir: -1 | 1) {
    const i = picked.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= picked.length) return;
    const next = [...picked];
    [next[i], next[j]] = [next[j], next[i]];
    setPicked(next);
  }

  const availableProducts = products.filter((p) => p.active && !picked.includes(p.id));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel>
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">На витрине ({picked.length}/6)</div>
              <div className="text-xs text-zinc-500">
                Порядок сверху вниз = слева направо на главной/клубе.
              </div>
            </div>
            <Btn variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Сохраняем…" : "Сохранить"}
            </Btn>
          </div>
        </div>
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Загрузка…</div>
        ) : picked.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Пусто. Добавь товары справа.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {picked.map((id, i) => {
              const p = productById.get(id);
              return (
                <li key={id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-6 text-center text-xs text-zinc-500">{i + 1}</div>
                  {p?.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="h-10 w-10 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-zinc-100 dark:bg-zinc-800" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{p?.title ?? "(удалён)"}</div>
                    <div className="text-xs text-zinc-500">
                      {p ? `${p.priceRub.toLocaleString("ru-RU")} ₽` : id}
                    </div>
                  </div>
                  <Btn variant="ghost" onClick={() => move(id, -1)} disabled={i === 0}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => move(id, 1)}
                    disabled={i === picked.length - 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Btn>
                  <Btn variant="ghost" onClick={() => remove(id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel>
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="font-medium">Доступные товары</div>
          <div className="text-xs text-zinc-500">Только активные. Клик — добавить на витрину.</div>
        </div>
        {availableProducts.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Нет товаров для добавления.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {availableProducts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                {p.images[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="h-10 w-10 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-zinc-100 dark:bg-zinc-800" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-zinc-500">
                    {p.priceRub.toLocaleString("ru-RU")} ₽ · {KIND_LABEL[p.kind]}
                  </div>
                </div>
                <Btn variant="ghost" onClick={() => add(p.id)}>
                  <Plus className="h-3.5 w-3.5" /> На витрину
                </Btn>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ============================================================================
// ORDERS
// ============================================================================

function OrdersTab() {
  const [status, setStatus] = useState<ShopOrderStatus | "all">("all");
  const { data, isLoading } = useQuery({
    queryKey: adminQk.shopOrders(status),
    queryFn: () => fetchAdminOrders(status === "all" ? undefined : status),
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const items = data?.items ?? [];

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          ["all", "pending_payment", "paid", "shipped", "delivered", "cancelled", "refunded"] as const
        ).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              status === s
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
            )}
          >
            {s === "all" ? "Все" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <Panel>
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Заказов пока нет</div>
        ) : (
          <DataTable
            headers={["Номер", "Дата", "Покупатель", "Сумма", "Билетов", "Статус", "СДЭК", ""]}
            rows={items.map((o: ShopOrder) => [
              <button
                type="button"
                onClick={() => setOpenId(o.id)}
                className="font-mono text-xs hover:underline"
              >
                {o.id.slice(0, 8)}
              </button>,
              new Date(o.createdAt).toLocaleDateString("ru-RU"),
              <div className="text-sm">
                {o.shipping.fio}
                <div className="text-[11px] text-zinc-500">{o.shipping.city}</div>
              </div>,
              `${o.totalRub.toLocaleString("ru-RU")} ₽`,
              o.bonusTicketsTotal > 0 ? `+${o.bonusTicketsTotal} 🎟` : "—",
              <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>,
              o.cdekTrack ? <code className="text-xs">{o.cdekTrack}</code> : "—",
              <Btn variant="ghost" onClick={() => setOpenId(o.id)}>
                Открыть
              </Btn>,
            ])}
          />
        )}
      </Panel>

      {openId && <OrderDrawer orderId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function OrderDrawer({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: adminQk.shopOrder(orderId),
    queryFn: () => fetchAdminOrder(orderId),
  });
  const [status, setStatus] = useState<ShopOrderStatus | "">("");
  const [track, setTrack] = useState("");

  // Заполняем поля при загрузке данных (один раз на orderId).
  useEffect(() => {
    if (data) {
      setStatus(data.status);
      setTrack(data.cdekTrack ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const patch = useMutation({
    mutationFn: () =>
      patchAdminOrder(orderId, {
        ...(status ? { status: status as ShopOrderStatus } : {}),
        ...(track !== "" ? { cdekTrack: track || null } : {}),
      }),
    onSuccess: () => {
      toast.success("Сохранено");
      qc.invalidateQueries({ queryKey: adminQk.shopOrder(orderId) });
      qc.invalidateQueries({ queryKey: ["admin", "shop", "orders"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Заказ ${orderId.slice(0, 8)}`}
      footer={
        <>
          <Btn onClick={onClose}>Закрыть</Btn>
          <Btn variant="primary" disabled={patch.isPending} onClick={() => patch.mutate()}>
            {patch.isPending ? "Сохраняем…" : "Сохранить"}
          </Btn>
        </>
      }
    >
      {isLoading || !data ? (
        <div className="py-8 text-center text-sm text-zinc-500">Загрузка…</div>
      ) : (
        <div className="space-y-5 text-sm">
          <div>
            <div className="text-xs uppercase text-zinc-500">Покупатель</div>
            <div className="font-medium">{data.shipping.fio}</div>
            <div className="text-zinc-500">{data.shipping.phone}</div>
            <div className="text-zinc-500">
              {data.shipping.city}, {data.shipping.address}
              {data.shipping.postalCode ? `, ${data.shipping.postalCode}` : ""}
            </div>
            {data.comment && (
              <div className="mt-2 rounded bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-800">
                {data.comment}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase text-zinc-500">Позиции</div>
            <ul className="mt-1 divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{it.titleSnapshot}</div>
                    <div className="text-xs text-zinc-500">
                      ×{it.qty}
                      {it.bonusTicketsSnapshot > 0 && ` · +${it.bonusTicketsSnapshot} 🎟 за шт.`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{(it.priceRubSnapshot * it.qty).toLocaleString("ru-RU")} ₽</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
              <span>Итого</span>
              <span>{data.totalRub.toLocaleString("ru-RU")} ₽</span>
            </div>
            {data.bonusTicketsTotal > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                <span>Билетов начислено</span>
                <span>+{data.bonusTicketsTotal} 🎟</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Field label="Статус">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShopOrderStatus | "")}
              >
                {(
                  [
                    "pending_payment",
                    "paid",
                    "shipped",
                    "delivered",
                    "cancelled",
                    "refunded",
                  ] as const
                ).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="СДЭК-трек">
              <TextInput
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder="1234567890"
              />
            </Field>
          </div>
        </div>
      )}
    </Drawer>
  );
}
