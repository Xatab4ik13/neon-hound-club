import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { IOSSheet } from "@/components/ios/IOSSheet";
import { IOSListSection, IOSListRow } from "@/components/ios/IOSList";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

type TabId = "profile" | "address" | "notify" | "account";

const TABS: { id: TabId; label: string; short: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Профиль и байк", short: "Профиль", icon: <User className="h-3.5 w-3.5" /> },
  { id: "address", label: "Доставка",       short: "Доставка", icon: <MapPin className="h-3.5 w-3.5" /> },
  { id: "notify",  label: "Уведомления",    short: "Уведом.",  icon: <Bell className="h-3.5 w-3.5" /> },
  { id: "account", label: "Аккаунт",        short: "Аккаунт",  icon: <ShieldAlert className="h-3.5 w-3.5" /> },
];

export function SettingsModal({ open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <SettingsMobile open={open} onOpenChange={onOpenChange} />
  ) : (
    <SettingsDesktop open={open} onOpenChange={onOpenChange} />
  );
}

// ════════════════════════════════════════════════════════════════════
// MOBILE — iOS Settings: список секций → drill-in в подэкран в том же sheet
// ════════════════════════════════════════════════════════════════════

function SettingsMobile({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<TabId | null>(null);

  // при открытии sheet — всегда возвращаемся в корень
  useEffect(() => {
    if (open) setTab(null);
  }, [open]);

  const currentTab = TABS.find((t) => t.id === tab) ?? null;

  return (
    <IOSSheet
      open={open}
      onOpenChange={onOpenChange}
      fullHeight
      title={currentTab ? currentTab.label : "Настройки"}
      headerLeft={
        currentTab ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab(null)}
              className="-ml-2 flex items-center gap-0.5 font-mono text-[13px] font-semibold text-primary active:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Назад
            </button>
            <h2 className="ml-2 truncate font-display text-lg font-black italic uppercase tracking-tight">
              {currentTab.label}
            </h2>
          </div>
        ) : undefined
      }
    >
      {currentTab === null ? (
        <IOSListSection>
          {TABS.map((t) => (
            <IOSListRow
              key={t.id}
              icon={<span className="grid h-5 w-5 place-items-center">{t.icon}</span>}
              label={t.label}
              chevron
              onClick={() => setTab(t.id)}
            />
          ))}
        </IOSListSection>
      ) : tab === "profile" ? (
        <ProfileTab mobile />
      ) : tab === "address" ? (
        <AddressTab mobile />
      ) : tab === "notify" ? (
        <NotifyTab mobile />
      ) : (
        <AccountTab mobile onClose={() => onOpenChange(false)} />
      )}
    </IOSSheet>
  );
}

// ════════════════════════════════════════════════════════════════════
// DESKTOP — оригинальная модалка
// ════════════════════════════════════════════════════════════════════

function SettingsDesktop({ open, onOpenChange }: Props) {
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
      <div aria-hidden className="absolute inset-0 bg-black/90" />

      <div
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden border-white/10 bg-[#0b0b0b] text-foreground shadow-2xl sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-4xl sm:border"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-7 sm:py-5">
          <h2 id="settings-title" className="font-display text-lg font-black uppercase italic tracking-tight sm:text-xl">
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

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
            {tab === "profile" && <ProfileTab />}
            {tab === "address" && <AddressTab />}
            {tab === "notify" && <NotifyTab />}
            {tab === "account" && <AccountTab onClose={() => onOpenChange(false)} />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ════════════════════════════════════════════════════════════════════
// shared field bricks (десктоп-стиль)
// ════════════════════════════════════════════════════════════════════

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

function PrimaryButton({ children, onClick, full }: { children: React.ReactNode; onClick?: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center justify-center gap-2 bg-primary px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 sm:py-2 " +
        (full ? "w-full" : "w-full sm:w-auto")
      }
    >
      {children}
    </button>
  );
}

// iOS-«поле в строке списка»: лейбл слева, инпут справа, без рамки
function IOSField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-2.5">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      {children}
      {hint && <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Tabs (mobile = grouped sections, desktop = старый layout)
// ════════════════════════════════════════════════════════════════════

const NICK_MAX = 16;
const NICK_MIN = 3;
const NICK_ALLOWED = /[^A-Za-z0-9_]/g;

function ProfileTab({ mobile }: { mobile?: boolean }) {
  const [nick, setNick] = useState(ME.nick);
  const [city, setCity] = useState(ME.city);
  const [bike, setBike] = useState(ME.bike);

  const onNickChange = (raw: string) => {
    const cleaned = raw.replace(NICK_ALLOWED, "").slice(0, NICK_MAX);
    setNick(cleaned);
  };

  const nickTrim = nick.trim();
  const nickError =
    nickTrim.length === 0
      ? null
      : nickTrim.length < NICK_MIN
        ? `Минимум ${NICK_MIN} символа`
        : null;

  if (mobile) {
    return (
      <>
        <IOSListSection title="Профиль" footer="Латиница, цифры и нижнее подчёркивание.">
          <IOSField
            label="Ник"
            hint={
              <div className="flex items-center justify-between">
                <span className={nickError ? "text-destructive" : ""}>
                  {nickError ?? `A–Z, 0–9, _ · ${NICK_MIN}–${NICK_MAX} симв.`}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground/60">
                  {nick.length}/{NICK_MAX}
                </span>
              </div>
            }
          >
            <Input
              value={nick}
              onChange={(e) => onNickChange(e.target.value)}
              maxLength={NICK_MAX}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={nickError ? true : undefined}
              placeholder="ASPHALT_DOG"
            />
          </IOSField>
          <IOSField label="Город">
            <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={64} placeholder="Москва" />
          </IOSField>
          <IOSField label="Аватар">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-white/10 bg-card/30 px-3 py-2.5 text-left text-[13px] text-muted-foreground active:bg-white/[0.04]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/20 font-display text-sm font-black italic uppercase text-primary">
                {nick.slice(0, 2)}
              </span>
              Загрузить новое фото
            </button>
          </IOSField>
        </IOSListSection>

        <IOSListSection title="Текущий байк" footer={<>Управление гаражом — на вкладке Гараж.</>}>
          <IOSField label="Марка и модель">
            <Input value={bike} onChange={(e) => setBike(e.target.value)} placeholder="Yamaha MT-09" />
          </IOSField>
          <IOSField label="Год">
            <Input type="number" defaultValue={2022} min={1950} max={2026} />
          </IOSField>
        </IOSListSection>

        <div className="px-1 pt-1">
          <PrimaryButton full>Сохранить</PrimaryButton>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Профиль</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ник">
            <Input
              value={nick}
              onChange={(e) => onNickChange(e.target.value)}
              maxLength={NICK_MAX}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={nickError ? true : undefined}
              placeholder="ASPHALT_DOG"
            />
            <div className="mt-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
              <span className={nickError ? "text-destructive" : "text-muted-foreground/70"}>
                {nickError ?? `A–Z, 0–9, _ · ${NICK_MIN}–${NICK_MAX} симв.`}
              </span>
              <span className="tabular-nums text-muted-foreground/60">
                {nick.length}/{NICK_MAX}
              </span>
            </div>
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

function AddressTab({ mobile }: { mobile?: boolean }) {
  if (mobile) {
    return (
      <>
        <IOSListSection title="Получатель">
          <IOSField label="ФИО"><Input placeholder="Иванов Иван Иванович" /></IOSField>
          <IOSField label="Телефон"><PhoneInput /></IOSField>
        </IOSListSection>

        <IOSListSection title="Адрес СДЭК" footer="Доставка только СДЭК. Используется для мерча и призов.">
          <IOSField label="Город"><Input placeholder="Москва" /></IOSField>
          <IOSField label="Индекс"><Input placeholder="101000" inputMode="numeric" /></IOSField>
          <IOSField label="Пункт выдачи или адрес"><Input placeholder="ПВЗ MSK123, ул. Тверская 1" /></IOSField>
          <IOSField label="Комментарий"><Input placeholder="Код домофона, этаж…" /></IOSField>
        </IOSListSection>

        <div className="px-1 pt-1">
          <PrimaryButton full>Сохранить адрес</PrimaryButton>
        </div>
      </>
    );
  }
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Адрес доставки</SectionTitle>
        <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Доставка только СДЭК. Используется для мерча и призов.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ФИО получателя"><Input placeholder="Иванов Иван Иванович" /></Field>
          <Field label="Телефон"><PhoneInput /></Field>
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

function NotifyTab({ mobile }: { mobile?: boolean }) {
  if (mobile) {
    return (
      <>
        <IOSListSection title="Email" footer="hellhound@example.com">
          <IOSToggleRow label="Розыгрыши и итоги" description="Запуск, последний день, победитель" defaultChecked />
          <IOSToggleRow label="Заказы" description="Оплата, отправка, доставка" defaultChecked />
          <IOSToggleRow label="Новости клуба" description="Анонсы мерча и видео" />
        </IOSListSection>
        <IOSListSection title="Push в браузере" footer="Уведомления на устройство">
          <IOSToggleRow label="Розыгрыши и итоги" defaultChecked />
          <IOSToggleRow label="Заказы" defaultChecked />
          <IOSToggleRow label="Новости клуба" />
        </IOSListSection>
      </>
    );
  }
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

function IOSToggleRow({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <IOSListRow
      label={label}
      description={description}
      trailing={<Switch defaultChecked={defaultChecked} />}
    />
  );
}

// ── Account / danger ─────────────────────────────────────────────────────
function AccountTab({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSavePassword = () => {
    setPwMsg(null);
    if (pwCurrent.length < 6) return setPwMsg({ kind: "err", text: "Введите текущий пароль" });
    if (pwNew.length < 6) return setPwMsg({ kind: "err", text: "Новый пароль минимум 6 символов" });
    if (pwNew !== pwNew2) return setPwMsg({ kind: "err", text: "Новые пароли не совпадают" });
    setPwMsg({ kind: "ok", text: "Пароль обновлён" });
    setPwCurrent("");
    setPwNew("");
    setPwNew2("");
  };

  const onLogout = () => {
    if (typeof window !== "undefined" && window.confirm("Выйти из аккаунта?")) {
      onClose?.();
      window.location.href = "/";
    }
  };
  const onDelete = () => {
    if (typeof window !== "undefined" && window.confirm("Удалить аккаунт навсегда?")) {
      // TODO
    }
  };

  if (mobile) {
    return (
      <>
        <IOSListSection title="Контакты" footer="Если телефон указан — войти можно по email или по телефону.">
          <IOSField label="Email"><Input type="email" defaultValue="hellhound@example.com" /></IOSField>
          <IOSField label="Телефон"><PhoneInput /></IOSField>
          <IOSField label="Telegram"><Input placeholder="@username" /></IOSField>
        </IOSListSection>

        <div className="mb-5 px-1">
          <PrimaryButton full>Сохранить</PrimaryButton>
        </div>

        <IOSListSection title="Пароль">
          {!pwOpen ? (
            <IOSListRow label="Сменить пароль" chevron onClick={() => { setPwOpen(true); setPwMsg(null); }} />
          ) : (
            <>
              <IOSField label="Текущий пароль">
                <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} autoComplete="current-password" />
              </IOSField>
              <IOSField label="Новый пароль">
                <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} autoComplete="new-password" />
              </IOSField>
              <IOSField
                label="Повторите новый"
                hint={pwMsg && (
                  <span className={pwMsg.kind === "ok" ? "text-primary" : "text-red-400"}>{pwMsg.text}</span>
                )}
              >
                <Input type="password" value={pwNew2} onChange={(e) => setPwNew2(e.target.value)} autoComplete="new-password" />
              </IOSField>
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => { setPwOpen(false); setPwMsg(null); setPwCurrent(""); setPwNew(""); setPwNew2(""); }}
                  className="flex-1 rounded-lg bg-white/[0.05] py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground active:opacity-70"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSavePassword}
                  className="flex-1 rounded-lg bg-primary py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-primary-foreground active:opacity-80"
                >
                  Сохранить
                </button>
              </div>
            </>
          )}
        </IOSListSection>

        <IOSListSection title="Опасная зона">
          <IOSListRow
            icon={<LogOut className="h-[18px] w-[18px]" />}
            label="Выйти из аккаунта"
            description="Завершить сессию на этом устройстве"
            tone="danger"
            chevron
            onClick={onLogout}
          />
          <IOSListRow
            icon={<Trash2 className="h-[18px] w-[18px]" />}
            label="Удалить аккаунт"
            description="Билеты, заказы и история обнулятся"
            tone="danger"
            chevron
            onClick={onDelete}
          />
        </IOSListSection>
      </>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Аккаунт</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email (для входа)">
            <Input type="email" defaultValue="hellhound@example.com" />
          </Field>
          <Field label="Телефон (для входа)">
            <PhoneInput />
          </Field>
          <Field label="Telegram"><Input placeholder="@username" /></Field>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Если телефон указан — войти можно по email или по телефону. Пароль один.
        </p>
        <div className="mt-4 flex justify-end">
          <PrimaryButton>Сохранить</PrimaryButton>
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-6">
        <SectionTitle>Пароль</SectionTitle>
        {!pwOpen ? (
          <button
            type="button"
            onClick={() => { setPwOpen(true); setPwMsg(null); }}
            className="inline-flex items-center gap-1.5 border border-white/15 bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-foreground transition-colors hover:border-white/40"
          >
            Сменить пароль
          </button>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Текущий пароль">
                <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} autoComplete="current-password" />
              </Field>
              <Field label="Новый пароль">
                <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} autoComplete="new-password" />
              </Field>
              <Field label="Повторите новый">
                <Input type="password" value={pwNew2} onChange={(e) => setPwNew2(e.target.value)} autoComplete="new-password" />
              </Field>
            </div>
            {pwMsg && (
              <p className={"font-mono text-[10px] uppercase tracking-wider " + (pwMsg.kind === "ok" ? "text-primary" : "text-red-400")}>
                {pwMsg.text}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setPwOpen(false); setPwMsg(null); setPwCurrent(""); setPwNew(""); setPwNew2(""); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                className="inline-flex items-center gap-1.5 bg-primary px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary-foreground transition-opacity hover:opacity-90"
              >
                Сохранить пароль
              </button>
            </div>
          </div>
        )}
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
            onClick={onLogout}
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
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-red-400 transition-colors hover:bg-red-500/20"
          >
            <Trash2 className="h-3 w-3" /> Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
