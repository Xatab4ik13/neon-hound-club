// Админка магазина: товары и заказы. Подключено к бэку через admin-queries.
// Модель упрощённая под server/src/db/schema/shop.ts:
// product = slug + title + description + priceRub + bonusTickets + images[] + stock(null|int) + active
// заказы — список со сменой статуса и СДЭК-треком.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Package, Receipt, X } from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  Panel,
  PanelHeader,
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
  type CreateProductInput,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ShopOrder, ShopOrderStatus, ShopProduct } from "@/lib/queries";

export const Route = createFileRoute("/admin/shop")({
  component: ShopPage,
});

type Tab = "products" | "orders";

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
      <PageHeader title="Магазин" description="Товары и заказы — живые данные с бэка." />

      <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(["products", "orders"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {t === "products" ? (
              <>
                <Package className="h-3.5 w-3.5" /> Товары
              </>
            ) : (
              <>
                <Receipt className="h-3.5 w-3.5" /> Заказы
              </>
            )}
          </button>
        ))}
      </div>

      {tab === "products" ? <ProductsTab /> : <OrdersTab />}
    </div>
  );
}

// ============== PRODUCTS ==============

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
  };
}

function ProductsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: adminQk.shopProducts,
    queryFn: fetchAdminShopProducts,
  });

  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [del, setDel] = useState<ShopProduct | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminProduct(id),
    onSuccess: () => {
      toast.success("Товар удалён");
      qc.invalidateQueries({ queryKey: adminQk.shopProducts });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  const items = data?.items ?? [];

  return (
    <>
      <div className="mb-3 flex justify-end">
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
            headers={["Товар", "Slug", "Цена", "Билетов", "Остаток", "Статус", ""]}
            rows={items.map((p) => [
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
                <span className="font-medium">{p.title}</span>
              </button>,
              <code className="text-xs text-zinc-500">{p.slug}</code>,
              `${p.priceRub.toLocaleString("ru-RU")} ₽`,
              p.bonusTickets > 0 ? `+${p.bonusTickets} 🎟` : "—",
              p.stock === null ? "∞" : p.stock,
              <Badge tone={p.active ? "emerald" : "zinc"}>{p.active ? "Активен" : "Скрыт"}</Badge>,
              <div className="flex gap-1">
                <Btn variant="ghost" onClick={() => setEditing(p)}>
                  <Edit className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost" onClick={() => setDel(p)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>,
            ])}
          />
        )}
      </Panel>

      {newOpen && (
        <ProductModal
          mode="create"
          initial={emptyProduct()}
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
          initial={{
            slug: editing.slug,
            title: editing.title,
            description: editing.description,
            priceRub: editing.priceRub,
            bonusTickets: editing.bonusTickets,
            images: editing.images,
            stock: editing.stock,
            active: editing.active,
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
        title="Удалить товар?"
        message={`«${del?.title}» будет удалён без возможности восстановления.`}
      />
    </>
  );
}

function ProductModal({
  mode,
  productId,
  initial,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  productId?: string;
  initial: CreateProductInput;
  onClose: () => void;
  onDone: () => void;
}) {
  const [p, setP] = useState<CreateProductInput>(initial);
  const [imagesText, setImagesText] = useState((initial.images ?? []).join("\n"));
  const [unlimited, setUnlimited] = useState(initial.stock === null);

  const save = useMutation({
    mutationFn: () => {
      const payload: CreateProductInput = {
        ...p,
        images: imagesText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        stock: unlimited ? null : Math.max(0, Number(p.stock) || 0),
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
          <Field label="Slug" hint="Латиница, цифры, дефис. Меняется только в крайнем случае.">
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
          <Field label="Цена (₽)">
            <TextInput
              type="number"
              min={0}
              value={p.priceRub}
              onChange={(e) => setP({ ...p, priceRub: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
          <Field label="Билетов за покупку" hint="Сколько 🎟 начислится покупателю при оплате.">
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
                onChange={(e) => setP({ ...p, stock: Math.max(0, Number(e.target.value) || 0) })}
                className="max-w-[140px]"
              />
            )}
          </div>
        </Field>
        <Field
          label="Картинки (URL'ы, по одной на строку)"
          hint="Первая — обложка. Грузим в MinIO/сторонний хост, сюда вставляем ссылки."
        >
          <TextArea
            rows={3}
            value={imagesText}
            onChange={(e) => setImagesText(e.target.value)}
            placeholder="https://cdn.hhr.pro/products/hoodie-front.jpg"
          />
        </Field>
      </div>
    </Modal>
  );
}

// ============== ORDERS ==============

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
        {(["all", "pending_payment", "paid", "shipped", "delivered", "cancelled", "refunded"] as const).map(
          (s) => (
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
          ),
        )}
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

  // Инициализируем поля из загруженных данных один раз.
  useMemo(() => {
    if (data) {
      setStatus(data.status);
      setTrack(data.cdekTrack ?? "");
    }
  }, [data]);

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

          <div className="grid gap-3">
            <Field label="Статус">
              <Select value={status} onChange={(e) => setStatus(e.target.value as ShopOrderStatus)}>
                {(Object.keys(STATUS_LABEL) as ShopOrderStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="СДЭК-трек" hint="Появится у клиента в карточке заказа.">
              <TextInput
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder="1234567890"
              />
            </Field>
          </div>

          <div className="text-xs text-zinc-500">
            <div>Создан: {new Date(data.createdAt).toLocaleString("ru-RU")}</div>
            {data.paidAt && <div>Оплачен: {new Date(data.paidAt).toLocaleString("ru-RU")}</div>}
            {data.shippedAt && (
              <div>Отправлен: {new Date(data.shippedAt).toLocaleString("ru-RU")}</div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
