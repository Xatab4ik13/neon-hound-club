import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Trash2 } from "@/components/ui/icons";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Btn,
  DataTable,
  Field,
  TextInput,
  Modal,
  Badge,
  ConfirmModal,
  Select,
} from "@/components/admin/ui";
import { fetchAdminShopProducts } from "@/lib/admin-queries";
import {
  adminCreatePromoCode,
  adminDeletePromoCode,
  adminListPromoCodes,
  adminUpdatePromoCode,
  promoQk,
  type AdminPromoCodeDto,
} from "@/lib/promo-api";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/admin/promo")({
  component: PromoAdminPage,
});

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU");
}

function statusBadge(p: AdminPromoCodeDto) {
  if (p.usedAt) return <Badge tone="zinc">Использован</Badge>;
  if (!p.active) return <Badge tone="zinc">Выключен</Badge>;
  if (p.expired) return <Badge tone="rose">Истёк</Badge>;
  return <Badge tone="emerald">Активен</Badge>;
}

function PromoAdminPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminPromoCodeDto | null>(null);
  const [q, setQ] = useState("");

  const listQ = useQuery({
    queryKey: promoQk.admin(),
    queryFn: () => adminListPromoCodes(),
  });

  const items = useMemo(() => {
    const all = listQ.data?.items ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (p) =>
        p.code.toLowerCase().includes(needle) ||
        (p.userNick ?? "").toLowerCase().includes(needle) ||
        (p.userEmail ?? "").toLowerCase().includes(needle),
    );
  }, [listQ.data, q]);

  const toggleMut = useMutation({
    mutationFn: (p: AdminPromoCodeDto) => adminUpdatePromoCode(p.id, { active: !p.active }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "promo"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось обновить"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeletePromoCode(id),
    onSuccess: () => {
      toast.success("Промокод удалён");
      void qc.invalidateQueries({ queryKey: ["admin", "promo"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось удалить"),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Промокоды"
        description="Скидка в процентах. Товарный промокод работает только если в корзине ровно 1 шт. этого товара — и билеты за такой заказ не начисляются. Доставка не скидывается никогда."
        actions={
          <Btn variant="primary" onClick={() => setCreateOpen(true)}>
            <Gift className="h-4 w-4" /> Создать промокод
          </Btn>
        }
      />

      <Panel>
        <PanelHeader>
          <div className="flex w-full items-center justify-between gap-3">
            <span>Все промокоды {listQ.data ? `(${listQ.data.items.length})` : ""}</span>
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск: код, ник, email"
              className="max-w-[240px]"
            />
          </div>
        </PanelHeader>
        <DataTable
          headers={["Код", "Скидка", "Товар", "Владелец", "Срок", "Статус", "Создан", ""]}
          rows={items.map((p) => [
            <span key="c" className="font-mono font-semibold uppercase">
              {p.code}
            </span>,
            `${p.discountPct}%`,
            p.productId ? (
              <span key="p" className="text-emerald-400">
                {p.productTitle ?? "товар"}
              </span>
            ) : (
              "вся корзина"
            ),
            p.userNick ? `@${p.userNick}` : "любой",
            fmtDate(p.expiresAt),
            statusBadge(p),
            fmtDate(p.createdAt),
            <div key="a" className="flex justify-end gap-2">
              <Btn onClick={() => toggleMut.mutate(p)} disabled={!!p.usedAt}>
                {p.active ? "Выключить" : "Включить"}
              </Btn>
              <Btn variant="danger" onClick={() => setToDelete(p)}>
                <Trash2 className="h-4 w-4" />
              </Btn>
            </div>,
          ])}
        />
      </Panel>

      {createOpen && <CreatePromoModal onClose={() => setCreateOpen(false)} />}

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteMut.mutate(toDelete.id);
          setToDelete(null);
        }}
        title="Удалить промокод?"
        message={toDelete ? `${toDelete.code} перестанет работать. Действие необратимо.` : ""}
        confirmLabel="Удалить"
      />
    </div>
  );
}

function CreatePromoModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [pct, setPct] = useState("10");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const [productId, setProductId] = useState("");

  const productsQ = useQuery({
    queryKey: ["admin", "shop", "products", "promo-picker"],
    queryFn: fetchAdminShopProducts,
  });

  const mut = useMutation({
    mutationFn: () =>
      adminCreatePromoCode({
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        discountPct: Number(pct),
        productId: productId || null,
        note: note.trim() || undefined,
        expiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
      }),
    onSuccess: (res) => {
      toast.success(`Промокод ${res.promo.code} создан`);
      void qc.invalidateQueries({ queryKey: ["admin", "promo"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось создать"),
  });

  const pctNum = Number(pct);
  const valid = Number.isFinite(pctNum) && pctNum >= 1 && pctNum <= 100;

  return (
    <Modal open onClose={onClose} title="Создать промокод">
      <div className="space-y-3">
        <Field label="Код" hint="Пусто — сгенерируем случайный">
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="HELL10"
            className="font-mono uppercase"
          />
        </Field>
        <Field label="Скидка, %">
          <TextInput
            type="number"
            min={1}
            max={100}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
          />
        </Field>
        <Field
          label="Товар"
          hint="Пусто — скидка на всю корзину. Выбран товар — купон сработает только если в корзине ровно 1 шт. этого товара, и билеты за заказ не начислятся."
        >
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Вся корзина (обычный промокод)</option>
            {(productsQ.data?.items ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {p.priceRub} ₽
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Действует до" hint="Пусто — без срока">
          <TextInput type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </Field>
        <Field label="Заметка">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Акция" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "…" : "Создать"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
