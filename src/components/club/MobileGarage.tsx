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
  docPhotos,
  docStatus,
  useBikeDocuments,
  type BikeDocument,
  type DocType,
} from "@/data/bike-documents";
import { uploadFileToS3 } from "@/lib/garage-api";
import { toast } from "sonner";

type Props = {
  bikes: StoredBike[];
  onPersist: (next: StoredBike[]) => void;
  onAddBike: () => void;
  onEditBike: (b: StoredBike) => void;
  onDeleteBike: (id: string) => void;
  variant?: "mobile" | "desktop";
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
  variant = "mobile",
}: Props) {
  const isDesktop = variant === "desktop";
  const [activeIdx, setActiveIdx] = useState(0);
  const [tab, setTab] = useState<"service" | "rides" | "docs">("service");
  const [fabOpen, setFabOpen] = useState(false);
  const [serviceSheet, setServiceSheet] = useState(false);
  const [rideSheet, setRideSheet] = useState(false);
  const [docSheet, setDocSheet] = useState<{ open: boolean; doc: BikeDocument | null }>({
    open: false,
    doc: null,
  });
  const [viewDoc, setViewDoc] = useState<BikeDocument | null>(null);

  const active = bikes[activeIdx];

  if (!active) {
    return <EmptyGarage onAdd={onAddBike} />;
  }

  // ─── общий handler для "Добавить" в текущем табе
  function quickAdd() {
    if (tab === "service") setServiceSheet(true);
    else if (tab === "rides") setRideSheet(true);
    else setDocSheet({ open: true, doc: null });
  }

  const tabOptions = [
    { value: "service" as const, label: "Сервис" },
    { value: "rides" as const, label: "Поездки" },
    { value: "docs" as const, label: "Документы" },
  ];

  const sheets = (
    <>
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
              setServiceSheet(true);
            }}
          />
          <IOSListRow
            icon={<RouteIcon className="h-5 w-5" />}
            label="Поездка"
            description="Километраж и маршрут"
            chevron
            onClick={() => {
              setFabOpen(false);
              setRideSheet(true);
            }}
          />
          <IOSListRow
            icon={<FileText className="h-5 w-5" />}
            label="Документ"
            description="ОСАГО, СТС, ВУ"
            chevron
            onClick={() => {
              setFabOpen(false);
              setDocSheet({ open: true, doc: null });
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
      <DocViewerSheet
        doc={viewDoc}
        onClose={() => setViewDoc(null)}
        onEdit={(d) => {
          setViewDoc(null);
          setDocSheet({ open: true, doc: d });
        }}
      />
    </>
  );

  // ───────────── Mobile (current) ─────────────
  if (!isDesktop) {
    return (
      <div className="pb-32">
        <header className="px-4 pb-3 pt-2">
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-[34px] font-bold leading-tight tracking-tight text-foreground">
              Гараж
            </h1>
            {bikes.length > 1 && (
              <BikeSwitch bikes={bikes} active={activeIdx} onChange={setActiveIdx} />
            )}
          </div>
        </header>

        <BikeHero bike={active} onEdit={() => onEditBike(active)} />
        <StatsGrid bike={active} />
        <ReminderRow bike={active} />

        <div className="mx-4 mt-5">
          <Segmented value={tab} onChange={(v) => setTab(v as typeof tab)} options={tabOptions} />
        </div>

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
                  onView={(doc) => setViewDoc(doc)}
                  onAdd={() => setDocSheet({ open: true, doc: null })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <Fab onClick={() => setFabOpen(true)} />
        {sheets}
      </div>
    );
  }

  // ───────────── Desktop: 2-col, no FAB ─────────────
  return (
    <div className="mx-auto w-full max-w-[1200px] px-8 py-8">
      {/* Header */}
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary">
            HELLHOUND · Garage
          </div>
          <h1 className="mt-1 text-[40px] font-bold leading-tight tracking-tight text-foreground">
            Гараж
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {bikes.length > 1 && (
            <BikeSwitch bikes={bikes} active={activeIdx} onChange={setActiveIdx} />
          )}
          <button
            type="button"
            onClick={() => onEditBike(active)}
            className="flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-white/[0.08]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Редактировать
          </button>
          {bikes.length < 2 && (
            <button
              type="button"
              onClick={onAddBike}
              className="flex h-10 items-center gap-2 rounded-full border border-primary/40 bg-primary/[0.1] px-4 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/[0.18]"
            >
              <Plus className="h-3.5 w-3.5" />
              Новый байк
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: hero */}
        <div className="col-span-5">
          <div className="sticky top-6">
            <BikeHero bike={active} onEdit={() => onEditBike(active)} size="lg" />
          </div>
        </div>

        {/* Right: stats + tabs */}
        <div className="col-span-7 space-y-5">
          <StatsGrid bike={active} columns={4} />
          <ReminderRow bike={active} inset={false} />

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Segmented
                value={tab}
                onChange={(v) => setTab(v as typeof tab)}
                options={tabOptions}
              />
            </div>
            <button
              type="button"
              onClick={quickAdd}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-sm shadow-primary/40 transition-transform hover:scale-[1.02] active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {tab === "service" ? "Сервис" : tab === "rides" ? "Поездка" : "Документ"}
            </button>
          </div>

          <div className="rounded-3xl border border-white/[0.06] bg-card/30 p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {tab === "service" && <ServiceList bikeId={active.id} flat />}
                {tab === "rides" && <RidesList bikeId={active.id} flat />}
                {tab === "docs" && (
                  <DocsList
                    bikeId={active.id}
                    onView={(doc) => setViewDoc(doc)}
                    onAdd={() => setDocSheet({ open: true, doc: null })}
                    flat
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Удаление байка — в подвале правой колонки */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onDeleteBike(active.id)}
              className="text-[12px] font-medium text-muted-foreground/60 hover:text-red-400 transition-colors"
            >
              Удалить этот байк
            </button>
          </div>
        </div>
      </div>

      {sheets}
    </div>
  );
}

function BikeSwitch({
  bikes,
  active,
  onChange,
}: {
  bikes: StoredBike[];
  active: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full bg-white/[0.06] p-1">
      {bikes.map((b, i) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onChange(i)}
          className={`h-8 rounded-full px-3 text-[12px] font-bold transition-all ${
            i === active
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={`${b.brand} ${b.model}`}
        >
          {b.brand}
        </button>
      ))}
    </div>
  );
}

// ───────────── Hero ─────────────

function BikeHero({
  bike,
  onEdit,
  size = "md",
}: {
  bike: StoredBike;
  onEdit: () => void;
  size?: "md" | "lg";
}) {
  const photo = bike.photo || placeholderBike;
  const isLg = size === "lg";

  return (
    <div className={isLg ? "" : "px-4"}>

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

function StatsGrid({ bike, columns = 2 }: { bike: StoredBike; columns?: 2 | 4 }) {
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

  const gridCls =
    columns === 4
      ? "grid grid-cols-4 gap-3"
      : "mt-4 grid grid-cols-2 gap-2.5 px-4";

  return (
    <div className={gridCls}>

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

function ReminderRow({ bike, inset = true }: { bike: StoredBike; inset?: boolean }) {
  const docs = useBikeDocuments();
  const journal = useBikeJournal();
  const km = parseMileage(bike.mileage);
  const service = journal.service.filter((s) => s.bikeId === bike.id);

  type R = { kind: "doc" | "service"; text: string; severity: "warn" | "danger" };
  const items: R[] = [];

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
    <div className={`space-y-1.5 ${inset ? "mt-4 px-4" : ""}`}>
      {items.slice(0, inset ? 3 : 4).map((r, i) => (
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

function ServiceList({ bikeId, flat = false }: { bikeId: string; flat?: boolean }) {
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
    <div className={flat ? "" : "px-4"}>
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

function RidesList({ bikeId, flat = false }: { bikeId: string; flat?: boolean }) {
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
    <div className={flat ? "" : "px-4"}>
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
  onView,
  onAdd,
  flat = false,
}: {
  bikeId: string;
  onView: (d: BikeDocument) => void;
  onAdd: () => void;
  flat?: boolean;
}) {
  const docs = useBikeDocuments();
  const list = docs.docs.filter((d) => d.bikeId === bikeId);

  if (list.length === 0) {
    return (
      <div className={flat ? "" : "px-4"}>
        <EmptyTab
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Документов пока нет"
          text="Добавь ОСАГО, СТС, ВУ — будут под рукой и с напоминаниями"
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
    <div className={flat ? "" : "px-4"}>
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
          const photos = docPhotos(d);
          return (
            <IOSListRow
              key={d.id}
              icon={<DocIcon type={d.type} />}
              label={DOC_TYPE_LABEL[d.type]}
              description={
                <>
                  {d.number || (d.issueDate ? fmtDate(d.issueDate) : "Нет данных")}
                  {photos.length > 0 ? ` · 📎 ${photos.length}` : ""}
                </>
              }
              trailing={
                <div className="flex items-center gap-2">
                  <span className={`text-[12px] font-semibold tabular-nums ${tone}`}>
                    {statusLabel}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                </div>
              }
              onClick={() => onView(d)}
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
  const initialPhotos = doc ? docPhotos(doc) : [];
  const [type, setType] = useState<DocType>(doc?.type ?? "osago");
  const [number, setNumber] = useState(doc?.number ?? "");
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? "");
  const [expiryDate, setExpiryDate] = useState(doc?.expiryDate ?? "");
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [note, setNote] = useState(doc?.note ?? "");

  // re-init when doc identity changes (используем sentinel, чтобы избежать infinite loop при doc=null)
  const lastDocKey = useRef<string>("__init__");
  const currentKey = doc ? `id:${doc.id}` : "new";
  if (open && currentKey !== lastDocKey.current) {
    lastDocKey.current = currentKey;
    setType(doc?.type ?? "osago");
    setNumber(doc?.number ?? "");
    setIssueDate(doc?.issueDate ?? "");
    setExpiryDate(doc?.expiryDate ?? "");
    setPhotos(doc ? docPhotos(doc) : []);
    setNote(doc?.note ?? "");
  }

  function save() {
    const payload = {
      bikeId,
      type,
      number: number.trim() || undefined,
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      photos: photos.length > 0 ? photos : undefined,
      photo: undefined, // чистим legacy
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

      <PhotosUpload photos={photos} onChange={setPhotos} bikeId={bikeId} />


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

function PhotosUpload({
  photos,
  onChange,
  bikeId,
}: {
  photos: string[];
  onChange: (v: string[]) => void;
  bikeId: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(files: FileList | null) {
    if (!files) return;
    const images = Array.from(files).filter((f) => /^image\//i.test(f.type));
    if (images.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of images) {
        const url = await uploadFileToS3(f, "bike", bikeId);
        urls.push(url);
      }
      onChange([...photos, ...urls]);
    } catch (err) {
      toast.error("Не удалось загрузить фото", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3">
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((src, i) => (
            <div
              key={i}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40"
            >
              <img src={src} alt={`Скан ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-foreground">
                {i + 1}
              </div>
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-foreground active:opacity-70"
                aria-label="Удалить"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.12] bg-black/20 py-5 text-muted-foreground active:opacity-70 disabled:opacity-50 ${
          photos.length > 0 ? "mt-2" : ""
        }`}
      >
        <ImagePlus className="h-5 w-5" />
        <span className="text-[14px] font-semibold">
          {uploading
            ? "Загрузка…"
            : photos.length === 0
              ? "Прикрепить фото / скан"
              : "Добавить ещё фото"}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            pick(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </button>
    </div>
  );
}

// ───────────── DocViewerSheet — режим показа документа ─────────────

function DocViewerSheet({
  doc,
  onClose,
  onEdit,
}: {
  doc: BikeDocument | null;
  onClose: () => void;
  onEdit: (d: BikeDocument) => void;
}) {
  if (!doc) return null;
  const photos = docPhotos(doc);
  const { status, daysLeft } = docStatus(doc);

  const statusPill =
    status === "expired"
      ? { text: `Просрочен${daysLeft !== null ? ` на ${Math.abs(daysLeft)} дн.` : ""}`, cls: "bg-red-500/15 text-red-300 border-red-500/40" }
      : status === "expiring"
        ? { text: `Истекает через ${daysLeft} дн.`, cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40" }
        : status === "ok"
          ? { text: `Действует${doc.expiryDate ? ` до ${fmtDate(doc.expiryDate)}` : ""}`, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" }
          : status === "no-expiry"
            ? { text: "Бессрочно", cls: "bg-white/[0.06] text-muted-foreground border-white/10" }
            : { text: "Срок не указан", cls: "bg-white/[0.06] text-muted-foreground border-white/10" };

  return (
    <IOSSheet
      open={!!doc}
      onOpenChange={(v) => !v && onClose()}
      title={DOC_TYPE_LABEL[doc.type]}
      doneLabel="Закрыть"
      onDone={onClose}
      fullHeight
      headerLeft={
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Документ</div>
          <h2 className="truncate text-[18px] font-bold leading-tight text-foreground">
            {DOC_TYPE_LABEL[doc.type]}
          </h2>
        </div>
      }
    >
      {/* статус-плашка */}
      <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${statusPill.cls}`}>
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <span className="text-[14px] font-semibold">{statusPill.text}</span>
      </div>

      {/* фото */}
      {photos.length > 0 ? (
        <div className="mt-3 space-y-2">
          {photos.map((src, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black"
            >
              <img src={src} alt={`Скан ${i + 1}`} className="w-full object-contain" />
              {photos.length > 1 && (
                <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-foreground">
                  {i + 1} / {photos.length}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/[0.12] bg-black/20 px-4 py-10 text-center text-muted-foreground">
          <ImagePlus className="h-6 w-6" />
          <span className="text-[13px]">Фото документа не прикреплено</span>
        </div>
      )}

      {/* данные */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
        {doc.number && <DataRow label="Номер" value={doc.number} mono />}
        {doc.issueDate && <DataRow label="Выдан" value={fmtDate(doc.issueDate)} />}
        {doc.expiryDate && <DataRow label="Действует до" value={fmtDate(doc.expiryDate)} />}
        {doc.note && <DataRow label="Заметка" value={doc.note} />}
        {!doc.number && !doc.issueDate && !doc.expiryDate && !doc.note && (
          <div className="px-4 py-4 text-[13px] text-muted-foreground">Нет данных</div>
        )}
      </div>

      {/* действия */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onEdit(doc)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3 text-[14px] font-semibold text-foreground active:opacity-70"
        >
          <Pencil className="h-4 w-4" />
          Изменить
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("Удалить документ?")) {
              bikeDocumentsStore.remove(doc.id);
              onClose();
            }
          }}
          className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/[0.06] py-3 text-[14px] font-semibold text-red-400 active:opacity-70"
        >
          <Trash2 className="h-4 w-4" />
          Удалить
        </button>
      </div>
    </IOSSheet>
  );
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-[15px] text-foreground ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </span>
    </div>
  );
}

// ───────────── FAB ─────────────

function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 active:scale-95"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 76px)",
        right: "max(1rem, env(safe-area-inset-right) + 1rem)",
      }}
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
