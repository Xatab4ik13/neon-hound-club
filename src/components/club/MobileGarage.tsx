// Мобильный iOS-вид гаража: байк-как-приложение.
// Hero фото → статы → segmented control (Сервис / Поездки / Документы) → FAB.

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bike,
  Calendar,
  ChevronRight,
  FileText,
  Gauge,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Route as RouteIcon,
  ShieldCheck,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import placeholderBike from "@/assets/bikes/placeholder.png";
import { IOSSheet } from "@/components/ios/IOSSheet";
import { IOSListRow, IOSListSection } from "@/components/ios/IOSList";
import { saveBikes, type StoredBike } from "@/data/bike-storage";
import {
  bikeJournalStore,
  kmUntilNextService,
  ridesKmThisMonth,
  SERVICE_TYPE_LABEL,
  type ServiceType,
  useBikeJournal,
} from "@/data/bike-journal";
import {
  bikeDocumentsStore,
  DOC_TYPE_LABEL,
  docStatus,
  useBikeDocuments,
  type BikeDocument,
  type DocType,
} from "@/data/bike-documents";

type Props = {
  bikes: StoredBike[];
  onPersist: (next: StoredBike[]) => void;
  onAddBike: () => void;
  onEditBike: (b: StoredBike) => void;
  onDeleteBike: (id: string) => void;
};

const SERVICE_TYPES: ServiceType[] = ["oil", "chain", "tires", "brakes", "to", "filter", "other"];
const DOC_TYPES: DocType[] = ["osago", "kasko", "to", "sts", "pts", "license"];

const fmtDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export function MobileGarage({
  bikes,
  onAddBike,
  onEditBike,
  onDeleteBike,
}: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [tab, setTab] = useState<"service" | "rides" | "docs">("service");
  const [fabOpen, setFabOpen] = useState(false);
  const [serviceSheet, setServiceSheet] = useState(false);
  const [rideSheet, setRideSheet] = useState(false);
  const [docSheet, setDocSheet] = useState<{ open: boolean; doc: BikeDocument | null }>({
    open: false,
    doc: null,
  });

  const active = bikes[activeIdx];

  if (!active) {
    return <EmptyGarage onAdd={onAddBike} />;
  }

  return (
    <div className="pb-32">
      {/* Заголовок iOS large title + переключатель байков */}
      <header className="px-4 pb-3 pt-2">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-[34px] font-bold leading-tight tracking-tight text-foreground">
            Гараж
          </h1>
          {bikes.length > 1 && (
            <div className="flex gap-1 rounded-full bg-white/[0.06] p-1">
              {bikes.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold transition-all ${
                    i === activeIdx
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/40"
                      : "text-muted-foreground"
                  }`}
                  aria-label={`${b.brand} ${b.model}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <BikeHero bike={active} onEdit={() => onEditBike(active)} />

      {/* Статы */}
      <StatsGrid bike={active} />

      {/* Напоминания */}
      <ReminderRow bike={active} />

      {/* Segmented control */}
      <div className="mx-4 mt-5">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: "service", label: "Сервис" },
            { value: "rides", label: "Поездки" },
            { value: "docs", label: "Документы" },
          ]}
        />
      </div>

      {/* Контент таба */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "service" && <ServiceList bikeId={active.id} />}
            {tab === "rides" && <RidesList bikeId={active.id} />}
            {tab === "docs" && (
              <DocsList
                bikeId={active.id}
                onEdit={(doc) => setDocSheet({ open: true, doc })}
                onAdd={() => setDocSheet({ open: true, doc: null })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FAB */}
      <Fab onClick={() => setFabOpen(true)} />

      {/* Action sheet */}
      <IOSSheet
        open={fabOpen}
        onOpenChange={setFabOpen}
        title="Добавить"
        doneLabel="Закрыть"
      >
        <IOSListSection>
          <IOSListRow
            icon={<Wrench className="h-5 w-5" />}
            label="Запись сервиса"
            description="Масло, цепь, ТО"
            chevron
            onClick={() => {
              setFabOpen(false);
              setTimeout(() => setServiceSheet(true), 180);
            }}
          />
          <IOSListRow
            icon={<RouteIcon className="h-5 w-5" />}
            label="Поездка"
            description="Километраж и маршрут"
            chevron
            onClick={() => {
              setFabOpen(false);
              setTimeout(() => setRideSheet(true), 180);
            }}
          />
          <IOSListRow
            icon={<FileText className="h-5 w-5" />}
            label="Документ"
            description="ОСАГО, ТО, СТС"
            chevron
            onClick={() => {
              setFabOpen(false);
              setTimeout(() => setDocSheet({ open: true, doc: null }), 180);
            }}
          />
        </IOSListSection>
        <IOSListSection title="Байк">
          <IOSListRow
            icon={<Pencil className="h-5 w-5" />}
            label="Редактировать"
            chevron
            onClick={() => {
              setFabOpen(false);
              onEditBike(active);
            }}
          />
          {bikes.length < 2 && (
            <IOSListRow
              icon={<Plus className="h-5 w-5" />}
              label="Добавить новый байк"
              chevron
              onClick={() => {
                setFabOpen(false);
                onAddBike();
              }}
            />
          )}
          <IOSListRow
            icon={<Trash2 className="h-5 w-5" />}
            label="Удалить этот байк"
            tone="danger"
            onClick={() => {
              setFabOpen(false);
              onDeleteBike(active.id);
            }}
          />
        </IOSListSection>
      </IOSSheet>

      <ServiceSheet
        open={serviceSheet}
        onOpenChange={setServiceSheet}
        bikeId={active.id}
        currentMileage={parseMileage(active.mileage)}
      />
      <RideSheet open={rideSheet} onOpenChange={setRideSheet} bikeId={active.id} />
      <DocSheet
        open={docSheet.open}
        doc={docSheet.doc}
        bikeId={active.id}
        onOpenChange={(v) => setDocSheet({ open: v, doc: docSheet.doc })}
      />
    </div>
  );
}

// ───────────── Hero ─────────────

function BikeHero({ bike, onEdit }: { bike: StoredBike; onEdit: () => void }) {
  const photo = bike.photo || placeholderBike;

  return (
    <div className="px-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-[#1a0a16] via-[#0e0e0e] to-black">
        {/* розовый glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 35%, color-mix(in oklab, var(--primary) 28%, transparent), transparent 70%)",
          }}
        />
        {/* halftone */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />

        <div className="relative aspect-[4/3]">
          <img
            src={photo}
            alt={`${bike.brand} ${bike.model}`}
            className="hero-bike-ios absolute inset-0 m-auto h-full w-full object-contain p-6"
          />
          <style>{`
            .hero-bike-ios {
              filter:
                drop-shadow(0 0 2px color-mix(in oklab, var(--primary) 80%, transparent))
                drop-shadow(0 0 18px color-mix(in oklab, var(--primary) 40%, transparent));
            }
          `}</style>

          {/* кнопка редактирования — iOS pill */}
          <button
            type="button"
            onClick={onEdit}
            className="absolute right-3 top-3 flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] bg-black/55 px-3 text-[12px] font-semibold text-foreground backdrop-blur-md active:opacity-70"
          >
            <Pencil className="h-3.5 w-3.5" />
            Изменить
          </button>
        </div>

        {/* Подпись */}
        <div className="relative px-5 pb-5">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-primary">
            {bike.brand} · {bike.year}
          </div>
          <h2 className="mt-0.5 text-[26px] font-bold leading-tight tracking-tight text-foreground">
            {bike.model}
          </h2>
          {bike.nickname && (
            <div className="mt-0.5 text-[13px] italic text-muted-foreground">
              «{bike.nickname}»
            </div>
          )}
          {(bike.color || (bike.mods && bike.mods.length > 0)) && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {bike.color && (
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-muted-foreground">
                  {bike.color}
                </span>
              )}
              {bike.mods?.slice(0, 4).map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-primary/[0.12] px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────── Stats ─────────────

function StatsGrid({ bike }: { bike: StoredBike }) {
  const journal = useBikeJournal();
  const rides = journal.rides.filter((r) => r.bikeId === bike.id);
  const service = journal.service.filter((s) => s.bikeId === bike.id);
  const km = parseMileage(bike.mileage);
  const monthKm = ridesKmThisMonth(rides);

  const nextOil = kmUntilNextService(service, "oil", km);
  const nextTo = kmUntilNextService(service, "to", km);
  const nextService =
    nextOil !== null && nextTo !== null
      ? Math.min(nextOil, nextTo)
      : (nextOil ?? nextTo);

  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5 px-4">
      <StatTile
        icon={<Gauge className="h-4 w-4" />}
        label="Пробег"
        value={km ? `${km.toLocaleString("ru-RU")}` : "—"}
        suffix={km ? "км" : undefined}
      />
      <StatTile
        icon={<RouteIcon className="h-4 w-4" />}
        label="В этом месяце"
        value={monthKm ? monthKm.toLocaleString("ru-RU") : "0"}
        suffix="км"
        accent={monthKm > 0}
      />
      <StatTile
        icon={<Wrench className="h-4 w-4" />}
        label="До сервиса"
        value={nextService === null ? "—" : nextService < 0 ? "Пора!" : nextService.toLocaleString("ru-RU")}
        suffix={nextService !== null && nextService >= 0 ? "км" : undefined}
        tone={nextService !== null && nextService < 0 ? "danger" : nextService !== null && nextService <= 500 ? "warning" : "default"}
      />
      <StatTile
        icon={<Bike className="h-4 w-4" />}
        label="Поездок"
        value={String(rides.length)}
      />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  suffix,
  tone = "default",
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  tone?: "default" | "warning" | "danger";
  accent?: boolean;
}) {
  const toneCls =
    tone === "danger"
      ? "text-red-400"
      : tone === "warning"
        ? "text-yellow-400"
        : accent
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-3.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={`text-[22px] font-bold leading-none tabular-nums ${toneCls}`}>
          {value}
        </span>
        {suffix && (
          <span className="text-[12px] font-medium text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ───────────── Reminders ─────────────

function ReminderRow({ bike }: { bike: StoredBike }) {
  const docs = useBikeDocuments();
  const journal = useBikeJournal();
  const km = parseMileage(bike.mileage);
  const service = journal.service.filter((s) => s.bikeId === bike.id);

  type R = { kind: "doc" | "service"; text: string; severity: "warn" | "danger" };
  const items: R[] = [];

  // Service reminders
  SERVICE_TYPES.forEach((t) => {
    const left = kmUntilNextService(service, t, km);
    if (left === null) return;
    if (left < 0) {
      items.push({
        kind: "service",
        text: `${SERVICE_TYPE_LABEL[t]} — просрочено на ${Math.abs(left).toLocaleString("ru-RU")} км`,
        severity: "danger",
      });
    } else if (left <= 500) {
      items.push({
        kind: "service",
        text: `${SERVICE_TYPE_LABEL[t]} — через ${left.toLocaleString("ru-RU")} км`,
        severity: "warn",
      });
    }
  });

  // Document reminders
  docs.docs
    .filter((d) => d.bikeId === bike.id)
    .forEach((d) => {
      const { status, daysLeft } = docStatus(d);
      if (status === "expired") {
        items.push({
          kind: "doc",
          text: `${DOC_TYPE_LABEL[d.type]} — просрочен ${daysLeft !== null ? `на ${Math.abs(daysLeft)} дн.` : ""}`,
          severity: "danger",
        });
      } else if (status === "expiring") {
        items.push({
          kind: "doc",
          text: `${DOC_TYPE_LABEL[d.type]} — истекает через ${daysLeft} дн.`,
          severity: "warn",
        });
      }
    });

  if (items.length === 0) return null;

  return (
    <div className="mt-4 space-y-1.5 px-4">
      {items.slice(0, 3).map((r, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] ${
            r.severity === "danger"
              ? "border-red-500/30 bg-red-500/[0.06] text-red-300"
              : "border-yellow-500/30 bg-yellow-500/[0.06] text-yellow-300"
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{r.text}</span>
        </div>
      ))}
    </div>
  );
}

// ───────────── Segmented ─────────────

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="relative grid grid-cols-3 gap-1 rounded-xl bg-white/[0.05] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`relative z-10 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              active ? "text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {active && (
              <motion.span
                layoutId="seg-pill"
                className="absolute inset-0 -z-10 rounded-lg bg-primary shadow-sm shadow-primary/40"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ───────────── Service list ─────────────

function ServiceList({ bikeId }: { bikeId: string }) {
  const journal = useBikeJournal();
  const service = useMemo(
    () =>
      journal.service
        .filter((s) => s.bikeId === bikeId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [journal.service, bikeId],
  );

  if (service.length === 0) {
    return (
      <EmptyTab
        icon={<Wrench className="h-6 w-6" />}
        title="Журнал сервиса пуст"
        text="Добавь первую запись через «+» внизу"
      />
    );
  }

  return (
    <div className="px-4">
      <IOSListSection>
        {service.map((s) => (
          <IOSListRow
            key={s.id}
            icon={<Wrench className="h-5 w-5" />}
            label={SERVICE_TYPE_LABEL[s.type]}
            description={
              <>
                {fmtDate(s.date)} · {s.mileage.toLocaleString("ru-RU")} км
                {s.note ? ` · ${s.note}` : ""}
              </>
            }
            trailing={
              <button
                type="button"
                onClick={() => {
                  if (confirm("Удалить запись?")) bikeJournalStore.removeService(s.id);
                }}
                aria-label="Удалить"
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground active:bg-white/[0.06]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            }
          />
        ))}
      </IOSListSection>
    </div>
  );
}

// ───────────── Rides list ─────────────

function RidesList({ bikeId }: { bikeId: string }) {
  const journal = useBikeJournal();
  const rides = useMemo(
    () =>
      journal.rides
        .filter((r) => r.bikeId === bikeId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [journal.rides, bikeId],
  );

  if (rides.length === 0) {
    return (
      <EmptyTab
        icon={<RouteIcon className="h-6 w-6" />}
        title="Поездок пока нет"
        text="Запиши первую — пойдёт в зачёт челленджа «500 км»"
      />
    );
  }

  return (
    <div className="px-4">
      <IOSListSection>
        {rides.map((r) => (
          <IOSListRow
            key={r.id}
            icon={<MapPin className="h-5 w-5" />}
            label={r.note || "Без названия"}
            description={fmtDate(r.date)}
            value={`${r.km} км`}
            trailing={
              <button
                type="button"
                onClick={() => {
                  if (confirm("Удалить поездку?")) bikeJournalStore.removeRide(r.id);
                }}
                aria-label="Удалить"
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground active:bg-white/[0.06]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            }
          />
        ))}
      </IOSListSection>
    </div>
  );
}

// ───────────── Docs list ─────────────

function DocsList({
  bikeId,
  onEdit,
  onAdd,
}: {
  bikeId: string;
  onEdit: (d: BikeDocument) => void;
  onAdd: () => void;
}) {
  const docs = useBikeDocuments();
  const list = docs.docs.filter((d) => d.bikeId === bikeId);

  if (list.length === 0) {
    return (
      <div className="px-4">
        <EmptyTab
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Документов пока нет"
          text="Добавь ОСАГО, ТО, СТС — будут напоминания об истечении"
        />
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/[0.08] py-3.5 text-[14px] font-semibold text-primary active:opacity-70"
        >
          <Plus className="h-4 w-4" />
          Добавить документ
        </button>
      </div>
    );
  }

  return (
    <div className="px-4">
      <IOSListSection>
        {list.map((d) => {
          const { status, daysLeft } = docStatus(d);
          const statusLabel =
            status === "expired"
              ? `Просрочен`
              : status === "expiring"
                ? `${daysLeft} дн.`
                : status === "ok" && d.expiryDate
                  ? `до ${fmtDate(d.expiryDate)}`
                  : status === "no-expiry"
                    ? "Бессрочно"
                    : "—";
          const tone =
            status === "expired"
              ? "text-red-400"
              : status === "expiring"
                ? "text-yellow-400"
                : "text-muted-foreground";
          return (
            <IOSListRow
              key={d.id}
              icon={<DocIcon type={d.type} />}
              label={DOC_TYPE_LABEL[d.type]}
              description={d.number || (d.issueDate ? fmtDate(d.issueDate) : "Нет данных")}
              trailing={
                <div className="flex items-center gap-2">
                  <span className={`text-[12px] font-semibold tabular-nums ${tone}`}>
                    {statusLabel}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                </div>
              }
              onClick={() => onEdit(d)}
            />
          );
        })}
      </IOSListSection>
    </div>
  );
}

function DocIcon({ type }: { type: DocType }) {
  if (type === "osago" || type === "kasko") return <ShieldCheck className="h-5 w-5" />;
  if (type === "license") return <FileText className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

// ───────────── Sheets ─────────────

function ServiceSheet({
  open,
  onOpenChange,
  bikeId,
  currentMileage,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bikeId: string;
  currentMileage: number;
}) {
  const [type, setType] = useState<ServiceType>("oil");
  const [date, setDate] = useState(todayIso());
  const [mileage, setMileage] = useState(String(currentMileage || ""));
  const [note, setNote] = useState("");

  function save() {
    const km = parseInt(mileage.replace(/\D/g, ""), 10);
    if (!Number.isFinite(km) || km <= 0) return;
    bikeJournalStore.addService({ bikeId, type, date, mileage: km, note: note.trim() || undefined });
    onOpenChange(false);
    setNote("");
  }

  return (
    <IOSSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Сервис"
      doneLabel="Сохранить"
      onDone={save}
    >
      <FieldGroup>
        <SelectField
          label="Тип"
          value={type}
          onChange={(v) => setType(v as ServiceType)}
          options={SERVICE_TYPES.map((t) => ({ value: t, label: SERVICE_TYPE_LABEL[t] }))}
        />
        <DateField label="Дата" value={date} onChange={setDate} />
        <TextField
          label="Пробег, км"
          value={mileage}
          onChange={setMileage}
          placeholder="18 400"
          inputMode="numeric"
        />
        <TextField
          label="Комментарий"
          value={note}
          onChange={setNote}
          placeholder="Motul 7100, фильтр K&N"
        />
      </FieldGroup>
    </IOSSheet>
  );
}

function RideSheet({
  open,
  onOpenChange,
  bikeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bikeId: string;
}) {
  const [date, setDate] = useState(todayIso());
  const [km, setKm] = useState("");
  const [note, setNote] = useState("");

  function save() {
    const n = parseInt(km.replace(/\D/g, ""), 10);
    if (!Number.isFinite(n) || n <= 0) return;
    bikeJournalStore.addRide({ bikeId, date, km: n, note: note.trim() || undefined });
    onOpenChange(false);
    setKm("");
    setNote("");
  }

  return (
    <IOSSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Поездка"
      doneLabel="Сохранить"
      onDone={save}
    >
      <FieldGroup>
        <DateField label="Дата" value={date} onChange={setDate} />
        <TextField
          label="Км"
          value={km}
          onChange={setKm}
          placeholder="120"
          inputMode="numeric"
        />
        <TextField
          label="Маршрут / заметка"
          value={note}
          onChange={setNote}
          placeholder="Каширка → Серпухов"
        />
      </FieldGroup>
    </IOSSheet>
  );
}

function DocSheet({
  open,
  doc,
  bikeId,
  onOpenChange,
}: {
  open: boolean;
  doc: BikeDocument | null;
  bikeId: string;
  onOpenChange: (v: boolean) => void;
}) {
  const [type, setType] = useState<DocType>(doc?.type ?? "osago");
  const [number, setNumber] = useState(doc?.number ?? "");
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? "");
  const [expiryDate, setExpiryDate] = useState(doc?.expiryDate ?? "");
  const [photo, setPhoto] = useState<string | undefined>(doc?.photo);
  const [note, setNote] = useState(doc?.note ?? "");

  // re-init when doc changes
  const lastDocId = useRef<string | null>(null);
  if (open && doc?.id !== lastDocId.current) {
    lastDocId.current = doc?.id ?? null;
    setType(doc?.type ?? "osago");
    setNumber(doc?.number ?? "");
    setIssueDate(doc?.issueDate ?? "");
    setExpiryDate(doc?.expiryDate ?? "");
    setPhoto(doc?.photo);
    setNote(doc?.note ?? "");
  }

  function save() {
    const payload = {
      bikeId,
      type,
      number: number.trim() || undefined,
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      photo,
      note: note.trim() || undefined,
    };
    if (doc) {
      bikeDocumentsStore.update(doc.id, payload);
    } else {
      bikeDocumentsStore.add(payload);
    }
    onOpenChange(false);
  }

  return (
    <IOSSheet
      open={open}
      onOpenChange={onOpenChange}
      title={doc ? "Документ" : "Новый документ"}
      doneLabel="Сохранить"
      onDone={save}
      fullHeight
    >
      <FieldGroup>
        <SelectField
          label="Тип"
          value={type}
          onChange={(v) => setType(v as DocType)}
          options={DOC_TYPES.map((t) => ({ value: t, label: DOC_TYPE_LABEL[t] }))}
        />
        <TextField label="Номер" value={number} onChange={setNumber} placeholder="ХХХ 0123456789" />
        <DateField label="Дата выдачи" value={issueDate} onChange={setIssueDate} />
        <DateField label="Действует до" value={expiryDate} onChange={setExpiryDate} />
      </FieldGroup>

      <PhotoUpload photo={photo} onChange={setPhoto} />

      <FieldGroup className="mt-3">
        <TextField label="Заметка" value={note} onChange={setNote} placeholder="Серия, страховая..." />
      </FieldGroup>

      {doc && (
        <button
          type="button"
          onClick={() => {
            if (confirm("Удалить документ?")) {
              bikeDocumentsStore.remove(doc.id);
              onOpenChange(false);
            }
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/[0.06] py-3 text-[14px] font-semibold text-red-400 active:opacity-70"
        >
          <Trash2 className="h-4 w-4" />
          Удалить документ
        </button>
      )}
    </IOSSheet>
  );
}

// ───────────── Form primitives (iOS grouped rows) ─────────────

function FieldGroup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05] ${className}`}
    >
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric";
}) {
  return (
    <label className="flex items-center gap-3 px-4 py-3">
      <span className="w-28 shrink-0 text-[13px] font-medium text-muted-foreground">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-right text-[15px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 px-4 py-3">
      <span className="w-28 shrink-0 text-[13px] font-medium text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-right text-[15px] text-foreground focus:outline-none [color-scheme:dark]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-3 px-4 py-3">
      <span className="w-28 shrink-0 text-[13px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-right text-[15px] text-foreground focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0b0b0b] text-foreground">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PhotoUpload({
  photo,
  onChange,
}: {
  photo?: string;
  onChange: (v: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!/^image\//i.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  if (photo) {
    return (
      <div className="mt-3 relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40">
        <img src={photo} alt="Документ" className="max-h-64 w-full object-contain" />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-foreground active:opacity-70"
          aria-label="Удалить фото"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute bottom-2 right-2 rounded-full bg-black/70 px-3 py-1.5 text-[12px] font-semibold text-foreground active:opacity-70"
        >
          Заменить
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? undefined)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.12] bg-black/20 py-6 text-muted-foreground active:opacity-70"
    >
      <ImagePlus className="h-5 w-5" />
      <span className="text-[14px] font-semibold">Прикрепить фото</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? undefined)}
      />
    </button>
  );
}

// ───────────── FAB ─────────────

function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 active:scale-95"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
      aria-label="Добавить"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </button>
  );
}

// ───────────── Empty states ─────────────

function EmptyGarage({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-4 pb-32 pt-8">
      <h1 className="text-[34px] font-bold tracking-tight text-foreground">Гараж</h1>
      <div className="mt-8 rounded-3xl border border-dashed border-white/[0.12] bg-card/30 p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Bike className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-[20px] font-bold text-foreground">Здесь будет твой мотик</h2>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Фото, документы, журнал сервиса и поездок
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground active:opacity-80"
        >
          <Plus className="h-4 w-4" />
          Добавить байк
        </button>
      </div>
    </div>
  );
}

function EmptyTab({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-4 rounded-2xl border border-dashed border-white/[0.1] bg-card/20 px-6 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-[16px] font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">{text}</p>
    </div>
  );
}

// ───────────── helpers ─────────────

function parseMileage(s: string | undefined): number {
  if (!s) return 0;
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

// keep imports used (suppress unused-warning fallbacks)
void Calendar;
void Upload;
void saveBikes;
