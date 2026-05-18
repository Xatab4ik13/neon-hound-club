import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ME } from "@/data/profile";
import {
  Bike,
  MapPin,
  Bell,
  ShieldAlert,
  LogOut,
  Trash2,
  User,
  X,
} from "lucide-react";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

type TabId = "profile" | "address" | "notify" | "account";

const TABS: { id: TabId; label: string; short: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Профиль и байк", short: "Профиль", icon: <User className="h-3.5 w-3.5" /> },
  { id: "address", label: "Доставка",       short: "Доставка", icon: <MapPin className="h-3.5 w-3.5" /> },
  { id: "notify",  label: "Уведомления",    short: "Уведом.",  icon: <Bell className="h-3.5 w-3.5" /> },
  { id: "account", label: "Аккаунт",        short: "Аккаунт",  icon: <ShieldAlert className="h-3.5 w-3.5" /> },
];

// Лёгкая модалка без radix-dialog: фон без blur, единственная fade-анимация.
// Анимации фоновых значков и плашек гасим через body[data-modal-open] (см. styles.css).
export function SettingsModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<TabId>("profile");

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-modal-open", "1");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.removeAttribute("data-modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex animate-fade-in items-stretch justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      {/* Сплошной фон без blur — браузер не перерисовывает то, что под ним. */}
      <div aria-hidden className="absolute inset-0 bg-black/90" />

      <div
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden border-white/10 bg-[#0b0b0b] text-foreground shadow-2xl sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-4xl sm:border"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-7 sm:py-5">
          <h2
            id="settings-title"
            className="font-display text-lg font-black uppercase italic tracking-tight sm:text-xl"
          >
            Настройки
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Закрыть"
            className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Мобильные табы — фиксированная сетка 4×, без скролла */}
        <div className="shrink-0 border-b border-white/[0.06] md:hidden">
          <div className="grid grid-cols-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  "flex flex-col items-center justify-center gap-1 border-b-2 px-1 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition-colors " +
                  (tab === t.id
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                {t.icon}
                <span className="leading-none">{t.short}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Тело: сайдбар + контент */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Десктоп-сайдбар */}
          <nav className="hidden shrink-0 flex-col border-r border-white/[0.06] md:flex md:w-60">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  "flex items-center gap-2 border-l-2 px-5 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors " +
                  (tab === t.id
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Контент со скроллом */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
            {tab === "profile" && <ProfileTab />}
            {tab === "address" && <AddressTab />}
            {tab === "notify" && <NotifyTab />}
            {tab === "account" && <AccountTab />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── shared ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
      {children}
    </h3>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex w-full items-center justify-center gap-2 bg-primary px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto sm:py-2"
    >
      {children}
    </button>
  );
}

// ── Profile + bike ─────────────────────────────────────────────────────────
function ProfileTab() {
  const [nick, setNick] = useState(ME.nick);
  const [city, setCity] = useState(ME.city);
  const [bike, setBike] = useState(ME.bike);
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Профиль</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ник">
            <Input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={32} />
          </Field>
          <Field label="Город">
            <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={64} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Аватар">
            <button
              type="button"
              className="flex w-full items-center gap-3 border border-dashed border-white/10 bg-card/30 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/20 font-display text-base font-black italic uppercase text-primary">
                {nick.slice(0, 2)}
              </span>
              Загрузить новое фото
            </button>
          </Field>
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-6">
        <SectionTitle>Текущий байк</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Марка и модель">
            <Input value={bike} onChange={(e) => setBike(e.target.value)} placeholder="Yamaha MT-09" />
          </Field>
          <Field label="Год">
            <Input type="number" defaultValue={2022} min={1950} max={2026} />
          </Field>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Управление гаражом — на странице <Bike className="-mt-0.5 inline h-3 w-3" /> «Мой гараж».
        </p>
      </div>

      <div className="flex justify-end border-t border-white/[0.06] pt-5">
        <PrimaryButton>Сохранить</PrimaryButton>
      </div>
    </div>
  );
}

// ── Address (СДЭК) ─────────────────────────────────────────────────────────
function AddressTab() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Адрес доставки</SectionTitle>
        <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Доставка только СДЭК. Используется для мерча и призов.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ФИО получателя"><Input placeholder="Иванов Иван Иванович" /></Field>
          <Field label="Телефон"><Input type="tel" placeholder="+7 999 000 00 00" /></Field>
          <Field label="Город"><Input placeholder="Москва" /></Field>
          <Field label="Индекс"><Input placeholder="101000" inputMode="numeric" /></Field>
        </div>
        <div className="mt-4">
          <Field label="Пункт выдачи СДЭК или адрес курьера">
            <Input placeholder="ПВЗ MSK123, ул. Тверская 1" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Комментарий">
            <Input placeholder="Код домофона, этаж…" />
          </Field>
        </div>
      </div>

      <div className="flex justify-end border-t border-white/[0.06] pt-5">
        <PrimaryButton>Сохранить адрес</PrimaryButton>
      </div>
    </div>
  );
}

// ── Notifications ──────────────────────────────────────────────────────────
function NotifyTab() {
  return (
    <div className="space-y-8">
      <ChannelBlock title="Email" desc="hellhound@example.com">
        <ToggleRow label="Розыгрыши и итоги" desc="Запуск, последний день, объявление победителя" defaultChecked />
        <ToggleRow label="Заказы" desc="Оплата, отправка, статус доставки" defaultChecked />
        <ToggleRow label="Новости клуба" desc="Анонсы мерча, события, видео" />
      </ChannelBlock>

      <ChannelBlock title="Push в браузере" desc="Уведомления на устройство">
        <ToggleRow label="Розыгрыши и итоги" defaultChecked />
        <ToggleRow label="Заказы" defaultChecked />
        <ToggleRow label="Новости клуба" />
      </ChannelBlock>
    </div>
  );
}

function ChannelBlock({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] pb-2">
        <h3 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">{title}</h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{desc}</span>
      </div>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </div>
  );
}

function ToggleRow({ label, desc, defaultChecked }: { label: string; desc?: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {desc && <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{desc}</div>}
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

// ── Account / danger ───────────────────────────────────────────────────────
function AccountTab() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Аккаунт</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input type="email" defaultValue="hellhound@example.com" /></Field>
          <Field label="Telegram"><Input placeholder="@username" /></Field>
        </div>
        <div className="mt-4">
          <button
            type="button"
            className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Сменить пароль
          </button>
        </div>
      </div>

      <div className="border border-red-500/30 bg-red-500/[0.03] p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <h3 className="font-display text-sm font-black uppercase italic tracking-widest text-red-400">
            Опасная зона
          </h3>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 border-b border-red-500/20 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0">
            <div className="text-sm text-foreground">Выйти из аккаунта</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Завершить сессию на этом устройстве
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 border border-white/15 bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-foreground transition-colors hover:border-white/40"
          >
            <LogOut className="h-3 w-3" /> Выйти
          </button>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0">
            <div className="text-sm text-foreground">Удалить аккаунт</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Все билеты, заказы и история обнулятся. Отменить нельзя.
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-red-400 transition-colors hover:bg-red-500/20"
          >
            <Trash2 className="h-3 w-3" /> Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
