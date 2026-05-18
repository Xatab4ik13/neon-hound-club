import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Download, Upload, Edit, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/admin/economy")({
  component: EconomyPage,
});

type Tab = "overview" | "operations" | "categories" | "partners";

type Operation = {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
  source: "auto" | "manual";
};

type Partner = { id: string; name: string; share: number };

const OPS_SEED: Operation[] = [
  { id: "1", date: "18.05", type: "income", category: "Магазин", amount: 12990, note: "Заказ #1042", source: "auto" },
  { id: "2", date: "18.05", type: "income", category: "Hell Pass", amount: 1290, note: "Продление Gold (vasya_pit)", source: "auto" },
  { id: "3", date: "17.05", type: "expense", category: "Реклама", amount: 35000, note: "Yandex Direct, май", source: "manual" },
  { id: "4", date: "16.05", type: "expense", category: "Призы", amount: 24500, note: "Шлем AGV для розыгрыша", source: "manual" },
  { id: "5", date: "15.05", type: "income", category: "Магазин", amount: 8490, note: "Заказ #1038", source: "auto" },
  { id: "6", date: "14.05", type: "expense", category: "Себестоимость", amount: 89000, note: "Партия худи (40 шт)", source: "manual" },
];

const CATS_SEED = ["Продакшн", "Себестоимость", "Призы", "Налоги", "Реклама", "Эквайринг", "Прочее"];

const PARTNERS_SEED: Partner[] = [
  { id: "1", name: "Hell", share: 60 },
  { id: "2", name: "Pavel (команда)", share: 25 },
  { id: "3", name: "Резервный фонд", share: 15 },
];

function EconomyPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [ops, setOps] = useState<Operation[]>(OPS_SEED);
  const [cats, setCats] = useState<string[]>(CATS_SEED);
  const [partners, setPartners] = useState<Partner[]>(PARTNERS_SEED);

  const [opOpen, setOpOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [distrConfirm, setDistrConfirm] = useState(false);

  const income = ops.filter((o) => o.type === "income").reduce((s, o) => s + o.amount, 0);
  const expense = ops.filter((o) => o.type === "expense").reduce((s, o) => s + o.amount, 0);
  const profit = income - expense;
  const totalShare = partners.reduce((s, p) => s + p.share, 0);

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
            <StatCard label="Доходы за май" value={`${income.toLocaleString("ru-RU")} ₽`} tone="emerald" />
            <StatCard label="Расходы за май" value={`${expense.toLocaleString("ru-RU")} ₽`} tone="rose" />
            <StatCard
              label="Чистая прибыль"
              value={`${profit.toLocaleString("ru-RU")} ₽`}
              tone={profit > 0 ? "emerald" : "rose"}
            />
          </div>
          <Panel>
            <PanelHeader>
              <h3 className="text-sm font-semibold">P&L по месяцам</h3>
              <Btn>
                <Download className="h-4 w-4" /> PDF
              </Btn>
            </PanelHeader>
            <div className="flex h-64 items-center justify-center px-6 text-sm text-zinc-500 dark:text-zinc-400">
              График подключим после связи с БД
            </div>
          </Panel>
        </>
      )}

      {tab === "operations" && (
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Операции</h3>
            <div className="flex gap-2">
              <Btn>
                <Upload className="h-4 w-4" /> Импорт
              </Btn>
              <Btn>
                <Download className="h-4 w-4" /> Экспорт
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setEditingOp({
                    id: "",
                    date: new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
                    type: "expense",
                    category: cats[0] ?? "",
                    amount: 0,
                    note: "",
                    source: "manual",
                  });
                  setOpOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Операция
              </Btn>
            </div>
          </PanelHeader>
          <DataTable
            headers={["Дата", "Тип", "Категория", "Сумма", "Источник", "Комментарий", ""]}
            rows={ops.map((o) => [
              o.date,
              <Badge tone={o.type === "income" ? "emerald" : "rose"}>
                {o.type === "income" ? "Доход" : "Расход"}
              </Badge>,
              o.category,
              <span
                className={cn(
                  "font-medium tabular-nums",
                  o.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              >
                {o.type === "income" ? "+" : "−"}
                {o.amount.toLocaleString("ru-RU")} ₽
              </span>,
              <Badge tone={o.source === "auto" ? "blue" : "zinc"}>
                {o.source === "auto" ? "Авто" : "Ручная"}
              </Badge>,
              <span className="text-zinc-500 dark:text-zinc-400">{o.note}</span>,
              <div className="flex gap-1">
                <Btn
                  variant="ghost"
                  onClick={() => {
                    setEditingOp(o);
                    setOpOpen(true);
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost" onClick={() => setOps((l) => l.filter((x) => x.id !== o.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>,
            ])}
          />
        </Panel>
      )}

      {tab === "categories" && (
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Категории расходов</h3>
            <Btn variant="primary" onClick={() => setCatOpen(true)}>
              <Plus className="h-4 w-4" /> Категория
            </Btn>
          </PanelHeader>
          <div className="flex flex-wrap gap-2 p-4">
            {cats.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {c}
                <button
                  type="button"
                  onClick={() => setCats((l) => l.filter((x) => x !== c))}
                  className="text-zinc-400 hover:text-rose-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </Panel>
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
            <div className="flex gap-2">
              <Btn
                onClick={() => {
                  setEditingPartner({ id: "", name: "", share: 0 });
                  setPartnerOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Партнёр
              </Btn>
              <Btn variant="primary" onClick={() => setDistrConfirm(true)}>
                Распределить за май
              </Btn>
            </div>
          </PanelHeader>
          <DataTable
            headers={["Партнёр", "Доля", "Расчётная выплата за май", ""]}
            rows={partners.map((p) => [
              <span className="font-medium">{p.name}</span>,
              <Badge tone="violet">{p.share}%</Badge>,
              <span className="font-medium tabular-nums">
                {Math.round((profit * p.share) / 100).toLocaleString("ru-RU")} ₽
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
                <Btn variant="ghost" onClick={() => setPartners((l) => l.filter((x) => x.id !== p.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>,
            ])}
          />
        </Panel>
      )}

      {editingOp && (
        <OperationModal
          open={opOpen}
          initial={editingOp}
          categories={cats}
          onClose={() => setOpOpen(false)}
          onSave={(o) => {
            if (o.id) setOps((l) => l.map((x) => (x.id === o.id ? o : x)));
            else setOps((l) => [{ ...o, id: String(Date.now()) }, ...l]);
            setOpOpen(false);
          }}
        />
      )}

      <CategoryModal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        onSave={(name) => {
          setCats((l) => [...l, name]);
          setCatOpen(false);
        }}
      />

      {editingPartner && (
        <PartnerModal
          open={partnerOpen}
          initial={editingPartner}
          onClose={() => setPartnerOpen(false)}
          onSave={(p) => {
            if (p.id) setPartners((l) => l.map((x) => (x.id === p.id ? p : x)));
            else setPartners((l) => [...l, { ...p, id: String(Date.now()) }]);
            setPartnerOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={distrConfirm}
        onClose={() => setDistrConfirm(false)}
        onConfirm={() => {}}
        title="Распределить прибыль?"
        message={`Будет создано ${partners.length} операций на общую сумму ${profit.toLocaleString("ru-RU")} ₽.`}
        confirmLabel="Распределить"
        danger={false}
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

function OperationModal({
  open,
  initial,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Operation;
  categories: string[];
  onClose: () => void;
  onSave: (o: Operation) => void;
}) {
  const [o, setO] = useState<Operation>(initial);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать операцию" : "Новая операция"}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={() => onSave(o)}>
            Сохранить
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тип">
            <Select
              value={o.type}
              onChange={(e) => setO({ ...o, type: e.target.value as Operation["type"] })}
            >
              <option value="income">Доход</option>
              <option value="expense">Расход</option>
            </Select>
          </Field>
          <Field label="Дата">
            <TextInput value={o.date} onChange={(e) => setO({ ...o, date: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Категория">
            <Select value={o.category} onChange={(e) => setO({ ...o, category: e.target.value })}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Магазин">Магазин</option>
              <option value="Hell Pass">Hell Pass</option>
            </Select>
          </Field>
          <Field label="Сумма (₽)">
            <TextInput
              type="number"
              value={o.amount}
              onChange={(e) => setO({ ...o, amount: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Комментарий">
          <TextArea
            rows={3}
            value={o.note}
            onChange={(e) => setO({ ...o, note: e.target.value })}
          />
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
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новая категория"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={() => name && onSave(name)}>
            Создать
          </Btn>
        </>
      }
    >
      <Field label="Название">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Логистика" />
      </Field>
    </Modal>
  );
}

function PartnerModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Partner;
  onClose: () => void;
  onSave: (p: Partner) => void;
}) {
  const [p, setP] = useState<Partner>(initial);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать партнёра" : "Новый партнёр"}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={() => onSave(p)}>
            Сохранить
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
