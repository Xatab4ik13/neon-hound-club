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
  PanelHeader,
  Modal,
  Field,
  TextInput,
  TextArea,
  Select,
  ConfirmModal,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";
import {
  fetchEconomyOverview,
  fetchEconomyOperations,
  createEconomyOperation,
  patchEconomyOperation,
  deleteEconomyOperation,
  fetchEconomyCategories,
  createEconomyCategory,
  deleteEconomyCategory,
  fetchEconomyPartners,
  createEconomyPartner,
  patchEconomyPartner,
  deleteEconomyPartner,
  type EconomyOperation,
  type EconomyCategory,
  type EconomyPartner,
} from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/economy")({
  component: EconomyPage,
});

type Tab = "overview" | "operations" | "categories" | "partners";

type OpDraft = {
  id: string;
  occurredAt: string; // ISO
  type: "income" | "expense";
  category: string;
  amountRub: number;
  note: string;
  source: "auto" | "manual";
};

function fmtRub(n: number) {
  return `${n.toLocaleString("ru-RU")} ₽`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function apiErr(e: unknown, fallback = "Ошибка") {
  return e instanceof ApiError ? e.message : fallback;
}

function EconomyPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");

  const overviewQ = useQuery({ queryKey: ["admin", "economy", "overview"], queryFn: fetchEconomyOverview });
  const opsQ = useQuery({ queryKey: ["admin", "economy", "ops"], queryFn: () => fetchEconomyOperations() });
  const catsQ = useQuery({ queryKey: ["admin", "economy", "cats"], queryFn: fetchEconomyCategories });
  const partnersQ = useQuery({ queryKey: ["admin", "economy", "partners"], queryFn: fetchEconomyPartners });

  const cats = catsQ.data?.items ?? [];
  const expenseCats = useMemo(() => cats.filter((c) => c.kind === "expense"), [cats]);
  const incomeCats = useMemo(() => cats.filter((c) => c.kind === "income"), [cats]);

  const ops = opsQ.data?.items ?? [];
  const partners = partnersQ.data?.items ?? [];
  const totalShare = partnersQ.data?.totalShare ?? 0;

  const overview = overviewQ.data;
  const profit = overview?.profit ?? 0;

  // ---- modals ----
  const [opOpen, setOpOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<OpDraft | null>(null);
  const [delOp, setDelOp] = useState<EconomyOperation | null>(null);

  const [catOpen, setCatOpen] = useState(false);
  const [delCat, setDelCat] = useState<EconomyCategory | null>(null);

  const [partnerOpen, setPartnerOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<EconomyPartner | null>(null);
  const [delPartner, setDelPartner] = useState<EconomyPartner | null>(null);

  // ---- mutations ----
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin", "economy"] });
  };

  const opCreateMut = useMutation({
    mutationFn: (d: OpDraft) =>
      createEconomyOperation({
        type: d.type,
        category: d.category,
        amountRub: d.amountRub,
        note: d.note,
        occurredAt: d.occurredAt,
      }),
    onSuccess: () => {
      toast.success("Операция добавлена");
      setOpOpen(false);
      invalidateAll();
    },
    onError: (e) => toast.error(apiErr(e)),
  });
  const opPatchMut = useMutation({
    mutationFn: (d: OpDraft) =>
      patchEconomyOperation(d.id, {
        type: d.type,
        category: d.category,
        amountRub: d.amountRub,
        note: d.note,
        occurredAt: d.occurredAt,
      }),
    onSuccess: () => {
      toast.success("Сохранено");
      setOpOpen(false);
      invalidateAll();
    },
    onError: (e) => toast.error(apiErr(e)),
  });
  const opDelMut = useMutation({
    mutationFn: (id: string) => deleteEconomyOperation(id),
    onSuccess: () => {
      toast.success("Удалено");
      setDelOp(null);
      invalidateAll();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const catCreateMut = useMutation({
    mutationFn: (d: { name: string; kind: "income" | "expense" }) => createEconomyCategory(d),
    onSuccess: () => {
      toast.success("Категория создана");
      setCatOpen(false);
      invalidateAll();
    },
    onError: (e) => toast.error(apiErr(e) === "exists" ? "Уже существует" : apiErr(e)),
  });
  const catDelMut = useMutation({
    mutationFn: (id: string) => deleteEconomyCategory(id),
    onSuccess: () => {
      toast.success("Категория удалена");
      setDelCat(null);
      invalidateAll();
    },
    onError: (e) => toast.error(apiErr(e) === "system_locked" ? "Системную категорию нельзя удалить" : apiErr(e)),
  });

  const partnerCreateMut = useMutation({
    mutationFn: (d: { name: string; share: number }) => createEconomyPartner(d),
    onSuccess: () => {
      toast.success("Партнёр добавлен");
      setPartnerOpen(false);
      invalidateAll();
    },
    onError: (e) => toast.error(apiErr(e)),
  });
  const partnerPatchMut = useMutation({
    mutationFn: (d: EconomyPartner) =>
      patchEconomyPartner(d.id, { name: d.name, share: d.share }),
    onSuccess: () => {
      toast.success("Сохранено");
      setPartnerOpen(false);
      invalidateAll();
    },
    onError: (e) => toast.error(apiErr(e)),
  });
  const partnerDelMut = useMutation({
    mutationFn: (id: string) => deleteEconomyPartner(id),
    onSuccess: () => {
      toast.success("Удалено");
      setDelPartner(null);
      invalidateAll();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  return (
    <div>
      <PageHeader title="Экономика" description="Кешфлоу, доли прибыли, P&L по месяцам" />

      <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(
          [
            ["overview", "Обзор"],
            ["operations", "Операции"],
            ["categories", "Категории"],
            ["partners", "Доли партнёров"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium",
              tab === t
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Доходы" value={fmtRub(overview?.income ?? 0)} tone="emerald" />
            <StatCard label="Расходы" value={fmtRub(overview?.expense ?? 0)} tone="rose" />
            <StatCard
              label="Чистая прибыль"
              value={fmtRub(profit)}
              tone={profit >= 0 ? "emerald" : "rose"}
            />
          </div>
          <Panel>
            <PanelHeader>
              <h3 className="text-sm font-semibold">P&L по месяцам</h3>
            </PanelHeader>
            {overviewQ.isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка…
              </div>
            ) : (
              <MonthlyBars data={overview?.monthly ?? []} />
            )}
          </Panel>
        </>
      )}

      {tab === "operations" && (
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">
              Операции <span className="ml-1 text-xs text-zinc-500">({ops.length})</span>
            </h3>
            <Btn
              variant="primary"
              onClick={() => {
                setEditingOp({
                  id: "",
                  occurredAt: new Date().toISOString(),
                  type: "expense",
                  category: expenseCats[0]?.name ?? "",
                  amountRub: 0,
                  note: "",
                  source: "manual",
                });
                setOpOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Операция
            </Btn>
          </PanelHeader>
          {opsQ.isLoading ? (
            <div className="p-4 text-center text-xs text-zinc-500">Загрузка…</div>
          ) : ops.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">Операций пока нет</div>
          ) : (
            <DataTable
              headers={["Дата", "Тип", "Категория", "Сумма", "Источник", "Комментарий", ""]}
              rows={ops.map((o) => [
                fmtDate(o.occurredAt),
                <Badge tone={o.type === "income" ? "emerald" : "rose"}>
                  {o.type === "income" ? "Доход" : "Расход"}
                </Badge>,
                o.category,
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    o.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {o.type === "income" ? "+" : "−"}
                  {o.amountRub.toLocaleString("ru-RU")} ₽
                </span>,
                <Badge tone={o.source === "auto" ? "blue" : "zinc"}>
                  {o.source === "auto" ? "Авто" : "Ручная"}
                </Badge>,
                <span className="text-zinc-500 dark:text-zinc-400">{o.note}</span>,
                <div className="flex gap-1">
                  <Btn
                    variant="ghost"
                    disabled={o.source === "auto"}
                    onClick={() => {
                      setEditingOp({
                        id: o.id,
                        occurredAt: o.occurredAt,
                        type: o.type,
                        category: o.category,
                        amountRub: o.amountRub,
                        note: o.note,
                        source: o.source,
                      });
                      setOpOpen(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Btn>
                  <Btn variant="ghost" disabled={o.source === "auto"} onClick={() => setDelOp(o)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                </div>,
              ])}
            />
          )}
        </Panel>
      )}

      {tab === "categories" && (
        <div className="grid gap-4 md:grid-cols-2">
          <CategoryPanel
            title="Категории расходов"
            kind="expense"
            items={expenseCats}
            onAdd={() => setCatOpen(true)}
            onDelete={setDelCat}
          />
          <CategoryPanel
            title="Категории доходов"
            kind="income"
            items={incomeCats}
            onAdd={() => setCatOpen(true)}
            onDelete={setDelCat}
          />
        </div>
      )}

      {tab === "partners" && (
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">
              Доли партнёров{" "}
              <span className={cn("ml-2 text-xs", totalShare === 100 ? "text-emerald-600" : "text-rose-600")}>
                {totalShare}%
              </span>
            </h3>
            <Btn
              variant="primary"
              onClick={() => {
                setEditingPartner({ id: "", name: "", share: 0, sort: 0 });
                setPartnerOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Партнёр
            </Btn>
          </PanelHeader>
          {partnersQ.isLoading ? (
            <div className="p-4 text-center text-xs text-zinc-500">Загрузка…</div>
          ) : partners.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">Партнёров нет</div>
          ) : (
            <DataTable
              headers={["Партнёр", "Доля", "Расчётная выплата с текущей прибыли", ""]}
              rows={partners.map((p) => [
                <span className="font-medium">{p.name}</span>,
                <Badge tone="violet">{p.share}%</Badge>,
                <span className="font-medium tabular-nums">
                  {Math.max(0, Math.round((profit * p.share) / 100)).toLocaleString("ru-RU")} ₽
                </span>,
                <div className="flex gap-1">
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setEditingPartner(p);
                      setPartnerOpen(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Btn>
                  <Btn variant="ghost" onClick={() => setDelPartner(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                </div>,
              ])}
            />
          )}
        </Panel>
      )}

      {editingOp && (
        <OperationModal
          open={opOpen}
          initial={editingOp}
          incomeCats={incomeCats.map((c) => c.name)}
          expenseCats={expenseCats.map((c) => c.name)}
          onClose={() => setOpOpen(false)}
          loading={opCreateMut.isPending || opPatchMut.isPending}
          onSave={(d) => (d.id ? opPatchMut.mutate(d) : opCreateMut.mutate(d))}
        />
      )}

      <CategoryModal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        loading={catCreateMut.isPending}
        onSave={(d) => catCreateMut.mutate(d)}
      />

      {editingPartner && (
        <PartnerModal
          open={partnerOpen}
          initial={editingPartner}
          onClose={() => setPartnerOpen(false)}
          loading={partnerCreateMut.isPending || partnerPatchMut.isPending}
          onSave={(p) =>
            p.id ? partnerPatchMut.mutate(p) : partnerCreateMut.mutate({ name: p.name, share: p.share })
          }
        />
      )}

      <ConfirmModal
        open={!!delOp}
        onClose={() => setDelOp(null)}
        onConfirm={() => delOp && opDelMut.mutate(delOp.id)}
        title="Удалить операцию?"
        message={delOp ? `${delOp.category} — ${fmtRub(delOp.amountRub)}` : ""}
        confirmLabel="Удалить"
      />
      <ConfirmModal
        open={!!delCat}
        onClose={() => setDelCat(null)}
        onConfirm={() => delCat && catDelMut.mutate(delCat.id)}
        title="Удалить категорию?"
        message={delCat?.name ?? ""}
        confirmLabel="Удалить"
      />
      <ConfirmModal
        open={!!delPartner}
        onClose={() => setDelPartner(null)}
        onConfirm={() => delPartner && partnerDelMut.mutate(delPartner.id)}
        title="Удалить партнёра?"
        message={delPartner?.name ?? ""}
        confirmLabel="Удалить"
      />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function MonthlyBars({ data }: { data: { month: string; income: number; expense: number }[] }) {
  if (!data.length) {
    return <div className="flex h-40 items-center justify-center text-sm text-zinc-500">Нет данных</div>;
  }
  const max = Math.max(1, ...data.flatMap((m) => [m.income, m.expense]));
  return (
    <div className="flex h-64 items-end gap-4 px-6 pb-6 pt-2">
      {data.map((m) => (
        <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-full w-full items-end justify-center gap-1">
            <div
              className="w-1/3 rounded-t bg-emerald-500/80"
              style={{ height: `${(m.income / max) * 100}%` }}
              title={`Доход: ${m.income.toLocaleString("ru-RU")} ₽`}
            />
            <div
              className="w-1/3 rounded-t bg-rose-500/80"
              style={{ height: `${(m.expense / max) * 100}%` }}
              title={`Расход: ${m.expense.toLocaleString("ru-RU")} ₽`}
            />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">{m.month}</div>
        </div>
      ))}
    </div>
  );
}

function CategoryPanel({
  title,
  kind,
  items,
  onAdd,
  onDelete,
}: {
  title: string;
  kind: "income" | "expense";
  items: EconomyCategory[];
  onAdd: () => void;
  onDelete: (c: EconomyCategory) => void;
}) {
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">{title}</h3>
        <Btn onClick={onAdd}>
          <Plus className="h-4 w-4" /> Добавить
        </Btn>
      </PanelHeader>
      <div className="flex flex-wrap gap-2 p-4">
        {items.length === 0 && <div className="text-xs text-zinc-500">Пусто</div>}
        {items.map((c) => (
          <span
            key={c.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
              kind === "income"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
            )}
          >
            {c.name}
            {!c.isSystem && (
              <button
                type="button"
                onClick={() => onDelete(c)}
                className="text-zinc-400 hover:text-rose-500"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function OperationModal({
  open,
  initial,
  incomeCats,
  expenseCats,
  onClose,
  onSave,
  loading,
}: {
  open: boolean;
  initial: OpDraft;
  incomeCats: string[];
  expenseCats: string[];
  onClose: () => void;
  onSave: (o: OpDraft) => void;
  loading?: boolean;
}) {
  const [o, setO] = useState<OpDraft>(initial);
  const dateInput = o.occurredAt ? o.occurredAt.slice(0, 10) : "";
  const cats = o.type === "income" ? incomeCats : expenseCats;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать операцию" : "Новая операция"}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn
            variant="primary"
            disabled={loading || !o.category || o.amountRub <= 0}
            onClick={() => onSave(o)}
          >
            {loading ? "Сохраняем…" : "Сохранить"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тип">
            <Select
              value={o.type}
              onChange={(e) => {
                const t = e.target.value as OpDraft["type"];
                const nextCats = t === "income" ? incomeCats : expenseCats;
                setO({ ...o, type: t, category: nextCats[0] ?? "" });
              }}
            >
              <option value="income">Доход</option>
              <option value="expense">Расход</option>
            </Select>
          </Field>
          <Field label="Дата">
            <TextInput
              type="date"
              value={dateInput}
              onChange={(e) => {
                const d = e.target.value
                  ? new Date(`${e.target.value}T12:00:00.000Z`).toISOString()
                  : new Date().toISOString();
                setO({ ...o, occurredAt: d });
              }}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Категория">
            <Select value={o.category} onChange={(e) => setO({ ...o, category: e.target.value })}>
              {cats.length === 0 && <option value="">— нет категорий —</option>}
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Сумма (₽)">
            <TextInput
              type="number"
              value={o.amountRub}
              onChange={(e) => setO({ ...o, amountRub: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Комментарий">
          <TextArea rows={3} value={o.note} onChange={(e) => setO({ ...o, note: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function CategoryModal({
  open,
  onClose,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (d: { name: string; kind: "income" | "expense" }) => void;
  loading?: boolean;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
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
            disabled={loading || !name.trim()}
            onClick={() => onSave({ name: name.trim(), kind })}
          >
            {loading ? "Создаём…" : "Создать"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Тип">
          <Select value={kind} onChange={(e) => setKind(e.target.value as "income" | "expense")}>
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </Select>
        </Field>
        <Field label="Название">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Логистика" />
        </Field>
      </div>
    </Modal>
  );
}

function PartnerModal({
  open,
  initial,
  onClose,
  onSave,
  loading,
}: {
  open: boolean;
  initial: EconomyPartner;
  onClose: () => void;
  onSave: (p: EconomyPartner) => void;
  loading?: boolean;
}) {
  const [p, setP] = useState<EconomyPartner>(initial);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать партнёра" : "Новый партнёр"}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn
            variant="primary"
            disabled={loading || !p.name.trim() || p.share < 0 || p.share > 100}
            onClick={() => onSave(p)}
          >
            {loading ? "Сохраняем…" : "Сохранить"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Имя / роль">
          <TextInput value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </Field>
        <Field label="Доля (%)" hint="Сумма всех долей должна быть 100%">
          <TextInput
            type="number"
            value={p.share}
            onChange={(e) => setP({ ...p, share: Number(e.target.value) })}
          />
        </Field>
      </div>
    </Modal>
  );
}
