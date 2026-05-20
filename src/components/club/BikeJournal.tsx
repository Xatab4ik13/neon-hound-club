// Журнал байка: вкладки «Сервис» и «Поездки» с быстрым добавлением.

import { useMemo, useState } from "react";
import { AlertTriangle, Bike, Calendar, Plus, Trash2, Wrench } from "lucide-react";
import {
  bikeJournalStore,
  kmUntilNextService,
  ridesKmThisMonth,
  SERVICE_TYPE_LABEL,
  type ServiceType,
  useBikeJournal,
} from "@/data/bike-journal";

type Props = {
  bikeId: string;
  /** Текущий пробег байка в км (числом), для расчёта напоминаний. */
  currentMileage?: number;
};

const SERVICE_TYPES: ServiceType[] = [
  "oil",
  "chain",
  "tires",
  "brakes",
  "to",
  "filter",
  "other",
];

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function BikeJournal({ bikeId, currentMileage = 0 }: Props) {
  const [tab, setTab] = useState<"service" | "rides">("service");
  const state = useBikeJournal();

  const service = useMemo(
    () =>
      state.service
        .filter((s) => s.bikeId === bikeId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [state.service, bikeId],
  );
  const rides = useMemo(
    () =>
      state.rides
        .filter((r) => r.bikeId === bikeId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [state.rides, bikeId],
  );

  const kmMonth = ridesKmThisMonth(rides);
  const lastServiceDate = service[0]?.date;

  return (
    <section
      aria-label="Журнал байка"
      className="border border-white/[0.06] bg-card/40"
    >
      {/* Header / summary */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" strokeWidth={1.8} />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Записей сервиса:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {service.length}
            </span>
          </span>
        </div>
        {lastServiceDate && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Последнее: {fmtDate(lastServiceDate)}
          </span>
        )}
        <div className="flex items-center gap-2 sm:ml-auto">
          <Bike className="h-4 w-4 text-primary" strokeWidth={1.8} />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            За этот месяц:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {kmMonth.toLocaleString("ru-RU")}
            </span>{" "}
            км
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        <TabBtn active={tab === "service"} onClick={() => setTab("service")}>
          Сервис · {service.length}
        </TabBtn>
        <TabBtn active={tab === "rides"} onClick={() => setTab("rides")}>
          Поездки · {rides.length}
        </TabBtn>
      </div>

      {tab === "service" ? (
        <ServiceTab
          bikeId={bikeId}
          currentMileage={currentMileage}
          service={service}
        />
      ) : (
        <RidesTab bikeId={bikeId} rides={rides} />
      )}
    </section>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.25em] transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ────────── Service tab ──────────

function ServiceTab({
  bikeId,
  currentMileage,
  service,
}: {
  bikeId: string;
  currentMileage: number;
  service: ReturnType<typeof useBikeJournal>["service"];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ServiceType>("oil");
  const [date, setDate] = useState(todayIso());
  const [mileage, setMileage] = useState<string>(String(currentMileage || ""));
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const km = parseInt(mileage.replace(/\D/g, ""), 10);
    if (!Number.isFinite(km) || km <= 0) return;
    bikeJournalStore.addService({
      bikeId,
      type,
      date,
      mileage: km,
      note: note.trim() || undefined,
    });
    setOpen(false);
    setNote("");
  }

  // Напоминания: показываем те, где осталось <= 500 км или уже просрочено
  const reminders = SERVICE_TYPES.map((t) => ({
    type: t,
    leftKm: kmUntilNextService(service, t, currentMileage),
  })).filter((r) => r.leftKm !== null && r.leftKm <= 500);

  return (
    <div className="p-4">
      {reminders.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5">
          {reminders.map((r) => (
            <div
              key={r.type}
              className={`flex items-center gap-2 border px-3 py-2 font-mono text-[11px] uppercase tracking-wider ${
                (r.leftKm ?? 0) < 0
                  ? "border-red-500/40 bg-red-500/[0.06] text-red-300"
                  : "border-yellow-500/40 bg-yellow-500/[0.06] text-yellow-300"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {SERVICE_TYPE_LABEL[r.type]}:{" "}
              {(r.leftKm ?? 0) < 0
                ? `просрочено на ${Math.abs(r.leftKm ?? 0).toLocaleString("ru-RU")} км`
                : `через ${(r.leftKm ?? 0).toLocaleString("ru-RU")} км`}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 inline-flex items-center gap-2 border border-primary/40 bg-primary/[0.06] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/15"
      >
        <Plus className="h-3 w-3" />
        Добавить запись
      </button>

      {open && (
        <form
          onSubmit={submit}
          className="mb-4 grid gap-3 border border-white/[0.06] bg-black/30 p-3 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Тип
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ServiceType)}
              className="border border-white/[0.1] bg-black/50 px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SERVICE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Дата
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-white/[0.1] bg-black/50 px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Пробег, км
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="18 400"
              className="border border-white/[0.1] bg-black/50 px-2 py-1.5 text-sm tabular-nums text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Комментарий
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Motul 7100, фильтр K&N"
              className="border border-white/[0.1] bg-black/50 px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              className="border border-primary bg-primary px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border border-white/[0.08] px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {service.length === 0 ? (
        <EmptyState text="Пока ни одной записи. Первая запись — +1 билет (квест «Сервис-апдейт»)." />
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {service.map((s) => (
            <li
              key={s.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5"
            >
              <span className="shrink-0 border border-white/[0.08] bg-black/30 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-foreground">
                {SERVICE_TYPE_LABEL[s.type]}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {fmtDate(s.date)}
                  </span>
                  <span className="tabular-nums">
                    {s.mileage.toLocaleString("ru-RU")} км
                  </span>
                </div>
                {s.note && (
                  <div className="mt-0.5 truncate text-sm text-foreground">
                    {s.note}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => bikeJournalStore.removeService(s.id)}
                aria-label="Удалить запись"
                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ────────── Rides tab ──────────

function RidesTab({
  bikeId,
  rides,
}: {
  bikeId: string;
  rides: ReturnType<typeof useBikeJournal>["rides"];
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [km, setKm] = useState<string>("");
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(km.replace(/\D/g, ""), 10);
    if (!Number.isFinite(n) || n <= 0) return;
    bikeJournalStore.addRide({ bikeId, date, km: n, note: note.trim() || undefined });
    setOpen(false);
    setKm("");
    setNote("");
  }

  const total = rides.reduce((s, r) => s + r.km, 0);
  const monthKm = ridesKmThisMonth(rides);

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 border border-primary/40 bg-primary/[0.06] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/15"
        >
          <Plus className="h-3 w-3" />
          Добавить поездку
        </button>
        <div className="ml-auto flex gap-6 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>
            Всего:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {total.toLocaleString("ru-RU")}
            </span>{" "}
            км
          </span>
          <span>
            В этом месяце:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {monthKm.toLocaleString("ru-RU")}
            </span>{" "}
            км
          </span>
        </div>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="mb-4 grid gap-3 border border-white/[0.06] bg-black/30 p-3 sm:grid-cols-[1fr_1fr_2fr_auto]"
        >
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Дата
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-white/[0.1] bg-black/50 px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Км
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="120"
              className="border border-white/[0.1] bg-black/50 px-2 py-1.5 text-sm tabular-nums text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Маршрут / заметка
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Каширка → Серпухов"
              className="border border-white/[0.1] bg-black/50 px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-9 border border-primary bg-primary px-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground"
            >
              Сохранить
            </button>
          </div>
        </form>
      )}

      {rides.length === 0 ? (
        <EmptyState text="Поездки помогают прогрессу по челленджу «500 км». Добавь первую." />
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {rides.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2.5"
            >
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {fmtDate(r.date)}
              </span>
              <div className="min-w-0 truncate text-sm text-foreground">
                {r.note || <span className="text-muted-foreground">—</span>}
              </div>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">
                {r.km} км
              </span>
              <button
                type="button"
                onClick={() => bikeJournalStore.removeRide(r.id)}
                aria-label="Удалить поездку"
                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-white/[0.08] bg-black/20 p-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
      {text}
    </div>
  );
}
