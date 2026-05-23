import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Bike,
  MapPin,
  Bell,
  ShieldAlert,
  LogOut,
  Trash2,
  User,
  X,
  Loader2,
  Camera,
  Plus,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useViewer } from "@/hooks/use-viewer";
import { IOSSheet } from "@/components/ios/IOSSheet";
import { IOSConfirm } from "@/components/ios/IOSConfirm";
import { IOSListSection, IOSListRow } from "@/components/ios/IOSList";
import {
  useMyProfile,
  useUpdateMyProfile,
  useBikes,
  useMyAddress,
  useSaveMyAddress,
  useMyNotifications,
  useSaveMyNotifications,
  useChangePassword,
  useDeleteAccount,
  uploadFileToS3,
  type NotificationPrefs,
  type ServerBike,
} from "@/lib/garage-api";
import { Link } from "@tanstack/react-router";

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
// MOBILE — iOS-style drill-in
// ════════════════════════════════════════════════════════════════════

function SettingsMobile({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<TabId | null>(null);

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
// DESKTOP
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
// shared bricks
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

function PrimaryButton({
  children,
  onClick,
  full,
  disabled,
  loading,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={
        "inline-flex items-center justify-center gap-2 bg-primary px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2 " +
        (full ? "w-full" : "w-full sm:w-auto")
      }
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {children}
    </button>
  );
}

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

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = (error as { message?: string })?.message || "Не удалось загрузить данные";
  return (
    <div className="mx-3 my-3 rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4">
      <div className="text-[13px] font-semibold text-red-400">Сервер недоступен</div>
      <div className="mt-1 text-[12px] text-muted-foreground break-words">{msg}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground active:opacity-70"
        >
          Повторить
        </button>
      )}
    </div>
  );
}

function Avatar({ url, size = 64 }: { url: string | null | undefined; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] text-muted-foreground"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <User className="h-1/2 w-1/2" />
      )}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ════════════════════════════════════════════════════════════════════


function ProfileTab({ mobile }: { mobile?: boolean }) {
  const meQ = useMyProfile();
  const bikesQ = useBikes();
  const updateMut = useUpdateMyProfile();

  const me = meQ.data;
  const bikes = bikesQ.data ?? [];

  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [telegram, setTelegram] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!me || hydrated.current) return;
    setCity(me.city ?? "");
    setPhone(me.phone ?? "");
    setBio(me.bio ?? "");
    setTelegram(me.telegram ?? "");
    setInstagram(me.instagram ?? "");
    setYoutube(me.youtube ?? "");
    hydrated.current = true;
  }, [me]);

  const onPickAvatar = () => fileRef.current?.click();

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Нужен файл-изображение");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Максимум 10 МБ");
      return;
    }
    setAvatarUploading(true);
    try {
      const url = await uploadFileToS3(file, "avatar");
      await updateMut.mutateAsync({ avatarUrl: url });
      toast.success("Аватар обновлён");
    } catch (err) {
      toast.error((err as Error).message || "Не удалось загрузить аватар");
    } finally {
      setAvatarUploading(false);
    }
  };

  const onSave = async () => {
    try {
      await updateMut.mutateAsync({
        city: city.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        telegram: telegram.trim() || null,
        instagram: instagram.trim() || null,
        youtube: youtube.trim() || null,
      });
      toast.success("Профиль сохранён");
    } catch (e) {
      toast.error((e as Error).message || "Не удалось сохранить");
    }
  };

  if (meQ.isLoading) return <LoadingBlock />;
  if (meQ.isError || !me) return <ErrorBlock error={meQ.error} onRetry={() => meQ.refetch()} />;

  // Скрытый input для выбора файла — общий для mobile и desktop.
  const hiddenFileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={onAvatarChange}
    />
  );

  if (mobile) {
    return (
      <>
        {hiddenFileInput}

        <IOSListSection title="Фото профиля" footer="JPG/PNG до 10 МБ.">
          <IOSListRow
            label={me.avatarUrl ? "Заменить фото" : "Загрузить фото"}
            description={avatarUploading ? "Загружаем…" : "Видно другим в профиле"}
            trailing={
              avatarUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Avatar url={me.avatarUrl} size={44} />
              )
            }
            chevron={!avatarUploading}
            onClick={avatarUploading ? undefined : onPickAvatar}
          />
        </IOSListSection>

        <IOSListSection title="Профиль" footer="Ник менять нельзя. Остальное — в любой момент.">
          <IOSField label="Ник">
            <Input value={me.nick} readOnly disabled />
          </IOSField>
          <IOSField label="Город">
            <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={64} placeholder="Москва" />
          </IOSField>
          <IOSField label="Телефон">
            <PhoneInput value={phone} onChange={(v) => setPhone(v ?? "")} />
          </IOSField>
          <IOSField label="О себе" hint={`${bio.length}/300`}>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} placeholder="Райдер. Москва. R6." />
          </IOSField>
        </IOSListSection>

        <IOSListSection title="Соцсети" footer="Только логины, без https://.">
          <IOSField label="Telegram">
            <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={80} placeholder="username" />
          </IOSField>
          <IOSField label="Instagram">
            <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={80} placeholder="username" />
          </IOSField>
          <IOSField label="YouTube">
            <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} maxLength={120} placeholder="@channel" />
          </IOSField>
        </IOSListSection>

        <IOSListSection
          title="Мои байки"
          footer="Тап по байку — открывается «Гараж» для редактирования."
        >
          {bikes.length === 0 ? (
            <IOSListRow
              icon={<Plus className="h-[18px] w-[18px]" />}
              label="Добавить байк"
              description="В гараже пока пусто"
              to="/club/garage"
              chevron
            />
          ) : (
            <>
              {bikes.map((b: ServerBike) => (
                <IOSListRow
                  key={b.id}
                  icon={<Bike className="h-[18px] w-[18px]" />}
                  label={`${b.brand} ${b.model}`}
                  description={
                    [b.isPrimary ? "Основной" : null, b.year ? String(b.year) : null]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                  to="/club/garage"
                  chevron
                />
              ))}
              <IOSListRow
                icon={<Plus className="h-[18px] w-[18px]" />}
                label="Добавить байк"
                to="/club/garage"
                chevron
              />
            </>
          )}
        </IOSListSection>

        <div className="px-1 pt-1">
          <PrimaryButton full onClick={onSave} loading={updateMut.isPending}>
            Сохранить
          </PrimaryButton>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-8">
      {hiddenFileInput}

      <div>
        <SectionTitle>Фото профиля</SectionTitle>
        <div className="flex items-center gap-4">
          <Avatar url={me.avatarUrl} size={72} />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onPickAvatar}
              disabled={avatarUploading}
              className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-white/[0.04] disabled:opacity-50"
            >
              {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              {me.avatarUrl ? "Заменить" : "Загрузить"}
            </button>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              JPG/PNG, до 10 МБ
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-6">
        <SectionTitle>Профиль</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ник">
            <Input value={me.nick} readOnly disabled />
          </Field>
          <Field label="Город">
            <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={64} />
          </Field>
          <Field label="Телефон">
            <PhoneInput value={phone} onChange={(v) => setPhone(v ?? "")} />
          </Field>
          <Field label="О себе">
            <Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} />
          </Field>
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-6">
        <SectionTitle>Соцсети</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Telegram"><Input value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={80} placeholder="username" /></Field>
          <Field label="Instagram"><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={80} placeholder="username" /></Field>
          <Field label="YouTube"><Input value={youtube} onChange={(e) => setYoutube(e.target.value)} maxLength={120} placeholder="@channel" /></Field>
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionTitle>Мои байки</SectionTitle>
          <Link
            to="/club/garage"
            className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80"
          >
            Открыть гараж →
          </Link>
        </div>
        {bikes.length === 0 ? (
          <p className="text-sm text-muted-foreground">В гараже пока пусто. Добавь первый байк в «Гараже».</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] border border-white/[0.06]">
            {bikes.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-foreground">
                    {b.brand} {b.model}{b.year ? ` · ${b.year}` : ""}
                  </div>
                  {b.isPrimary && (
                    <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
                      Основной
                    </div>
                  )}
                </div>
                <Link
                  to="/club/garage"
                  className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  Изменить
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end border-t border-white/[0.06] pt-5">
        <PrimaryButton onClick={onSave} loading={updateMut.isPending}>Сохранить</PrimaryButton>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ADDRESS TAB
// ════════════════════════════════════════════════════════════════════

function AddressTab({ mobile }: { mobile?: boolean }) {
  const q = useMyAddress();
  const saveMut = useSaveMyAddress();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [pickupPoint, setPickupPoint] = useState("");
  const [comment, setComment] = useState("");

  const hydrated = useRef(false);
  useEffect(() => {
    if (!q.data || hydrated.current) return;
    setFullName(q.data.fullName);
    setPhone(q.data.phone);
    setCity(q.data.city);
    setPostalCode(q.data.postalCode);
    setPickupPoint(q.data.pickupPoint);
    setComment(q.data.comment);
    hydrated.current = true;
  }, [q.data]);

  const onSave = async () => {
    try {
      await saveMut.mutateAsync({ fullName, phone, city, postalCode, pickupPoint, comment });
      toast.success("Адрес сохранён");
    } catch (e) {
      toast.error((e as Error).message || "Не удалось сохранить");
    }
  };

  if (q.isLoading) return <LoadingBlock />;
  if (q.isError) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;

  if (mobile) {
    return (
      <>
        <IOSListSection title="Получатель">
          <IOSField label="ФИО"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" /></IOSField>
          <IOSField label="Телефон"><PhoneInput value={phone} onChange={(v) => setPhone(v ?? "")} /></IOSField>
        </IOSListSection>

        <IOSListSection title="Адрес СДЭК" footer="Доставка только СДЭК. Используется для мерча и призов.">
          <IOSField label="Город"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" /></IOSField>
          <IOSField label="Индекс"><Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="101000" inputMode="numeric" /></IOSField>
          <IOSField label="Пункт выдачи или адрес"><Input value={pickupPoint} onChange={(e) => setPickupPoint(e.target.value)} placeholder="ПВЗ MSK123, ул. Тверская 1" /></IOSField>
          <IOSField label="Комментарий"><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Код домофона, этаж…" /></IOSField>
        </IOSListSection>

        <div className="px-1 pt-1">
          <PrimaryButton full onClick={onSave} loading={saveMut.isPending}>Сохранить адрес</PrimaryButton>
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
          <Field label="ФИО получателя"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" /></Field>
          <Field label="Телефон"><PhoneInput value={phone} onChange={(v) => setPhone(v ?? "")} /></Field>
          <Field label="Город"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" /></Field>
          <Field label="Индекс"><Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="101000" inputMode="numeric" /></Field>
        </div>
        <div className="mt-4">
          <Field label="Пункт выдачи СДЭК или адрес курьера">
            <Input value={pickupPoint} onChange={(e) => setPickupPoint(e.target.value)} placeholder="ПВЗ MSK123, ул. Тверская 1" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Комментарий">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Код домофона, этаж…" />
          </Field>
        </div>
      </div>

      <div className="flex justify-end border-t border-white/[0.06] pt-5">
        <PrimaryButton onClick={onSave} loading={saveMut.isPending}>Сохранить адрес</PrimaryButton>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// NOTIFICATIONS TAB
// ════════════════════════════════════════════════════════════════════

function NotifyTab({ mobile }: { mobile?: boolean }) {
  const q = useMyNotifications();
  const saveMut = useSaveMyNotifications();
  const meQ = useMyProfile();

  const toggle = (key: keyof Omit<NotificationPrefs, "userId">) => (v: boolean) => {
    saveMut.mutate({ [key]: v });
  };

  if (q.isLoading) return <LoadingBlock />;
  if (q.isError) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <LoadingBlock />;
  const p = q.data;

  if (mobile) {
    return (
      <>
        <IOSListSection title="Email" footer={meQ.data?.email}>
          <IOSToggleRow label="Розыгрыши и итоги" description="Запуск, последний день, победитель" checked={p.emailRaffles} onChange={toggle("emailRaffles")} />
          <IOSToggleRow label="Заказы" description="Оплата, отправка, доставка" checked={p.emailOrders} onChange={toggle("emailOrders")} />
          <IOSToggleRow label="Новости клуба" description="Анонсы мерча и видео" checked={p.emailNews} onChange={toggle("emailNews")} />
        </IOSListSection>
        <IOSListSection title="Push в браузере" footer="Работает в установленной PWA после разрешения уведомлений.">
          <IOSToggleRow label="Розыгрыши и итоги" checked={p.pushRaffles} onChange={toggle("pushRaffles")} />
          <IOSToggleRow label="Заказы" checked={p.pushOrders} onChange={toggle("pushOrders")} />
          <IOSToggleRow label="Новости клуба" checked={p.pushNews} onChange={toggle("pushNews")} />
        </IOSListSection>
      </>
    );
  }
  return (
    <div className="space-y-8">
      <ChannelBlock title="Email" desc={meQ.data?.email ?? ""}>
        <ToggleRow label="Розыгрыши и итоги" desc="Запуск, последний день, объявление победителя" checked={p.emailRaffles} onChange={toggle("emailRaffles")} />
        <ToggleRow label="Заказы" desc="Оплата, отправка, статус доставки" checked={p.emailOrders} onChange={toggle("emailOrders")} />
        <ToggleRow label="Новости клуба" desc="Анонсы мерча, события, видео" checked={p.emailNews} onChange={toggle("emailNews")} />
      </ChannelBlock>

      <ChannelBlock title="Push в браузере" desc="Уведомления на устройство">
        <ToggleRow label="Розыгрыши и итоги" checked={p.pushRaffles} onChange={toggle("pushRaffles")} />
        <ToggleRow label="Заказы" checked={p.pushOrders} onChange={toggle("pushOrders")} />
        <ToggleRow label="Новости клуба" checked={p.pushNews} onChange={toggle("pushNews")} />
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

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {desc && <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{desc}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function IOSToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <IOSListRow
      label={label}
      description={description}
      trailing={<Switch checked={checked} onCheckedChange={onChange} />}
    />
  );
}

// ════════════════════════════════════════════════════════════════════
// ACCOUNT TAB
// ════════════════════════════════════════════════════════════════════

function AccountTab({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const meQ = useMyProfile();
  const changePwMut = useChangePassword();
  const deleteMut = useDeleteAccount();
  const { signOut } = useViewer();

  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [delOpen, setDelOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState("");

  const handleSavePassword = async () => {
    setPwMsg(null);
    if (pwCurrent.length < 1) return setPwMsg({ kind: "err", text: "Введите текущий пароль" });
    if (pwNew.length < 8) return setPwMsg({ kind: "err", text: "Новый пароль минимум 8 символов" });
    if (pwNew !== pwNew2) return setPwMsg({ kind: "err", text: "Новые пароли не совпадают" });
    try {
      await changePwMut.mutateAsync({ currentPassword: pwCurrent, newPassword: pwNew });
      setPwMsg({ kind: "ok", text: "Пароль обновлён" });
      setPwCurrent("");
      setPwNew("");
      setPwNew2("");
      toast.success("Пароль обновлён");
    } catch (e) {
      const msg = (e as { message?: string }).message ?? "Не удалось обновить пароль";
      setPwMsg({ kind: "err", text: msg });
    }
  };

  const [confirmLogout, setConfirmLogout] = useState(false);
  const doLogoutNow = async () => {
    try {
      await signOut();
    } finally {
      onClose?.();
      window.location.href = "/";
    }
  };
  const onLogout = () => setConfirmLogout(true);


  const onDelete = async () => {
    try {
      await deleteMut.mutateAsync({ confirmNick: delConfirm });
      toast.success("Аккаунт удалён");
      onClose?.();
      window.location.href = "/";
    } catch (e) {
      toast.error((e as Error).message || "Не удалось удалить аккаунт");
    }
  };

  const myNick = meQ.data?.nick ?? "";
  const delMatch = delConfirm.trim().toLowerCase() === myNick.toLowerCase() && myNick.length > 0;

  if (mobile) {
    return (
      <>
        <IOSListSection title="Контакты" footer="Email — для входа. Смена email пока через поддержку.">
          <IOSField label="Email">
            <Input type="email" value={meQ.data?.email ?? ""} readOnly disabled />
          </IOSField>
        </IOSListSection>

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
                  disabled={changePwMut.isPending}
                  className="flex-1 rounded-lg bg-primary py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-primary-foreground active:opacity-80 disabled:opacity-50"
                >
                  {changePwMut.isPending ? "…" : "Сохранить"}
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
          {!delOpen ? (
            <IOSListRow
              icon={<Trash2 className="h-[18px] w-[18px]" />}
              label="Удалить аккаунт"
              description="Билеты, заказы и история обнулятся"
              tone="danger"
              chevron
              onClick={() => setDelOpen(true)}
            />
          ) : (
            <>
              <IOSField
                label={`Введи свой ник «${myNick}» для подтверждения`}
                hint="Действие необратимо. Все данные будут стёрты."
              >
                <Input value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
              </IOSField>
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => { setDelOpen(false); setDelConfirm(""); }}
                  className="flex-1 rounded-lg bg-white/[0.05] py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground active:opacity-70"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={!delMatch || deleteMut.isPending}
                  className="flex-1 rounded-lg bg-red-500 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-white active:opacity-80 disabled:opacity-40"
                >
                  {deleteMut.isPending ? "…" : "Удалить"}
                </button>
              </div>
            </>
          )}
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
            <Input type="email" value={meQ.data?.email ?? ""} readOnly disabled />
          </Field>
          <Field label="Ник">
            <Input value={meQ.data?.nick ?? ""} readOnly disabled />
          </Field>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Смена email и ника пока через поддержку.
        </p>
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
                disabled={changePwMut.isPending}
                className="inline-flex items-center gap-1.5 bg-primary px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {changePwMut.isPending ? "…" : "Сохранить пароль"}
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
        <div className="flex flex-col items-start gap-3 py-3 sm:gap-4">
          <div className="min-w-0">
            <div className="text-sm text-foreground">Удалить аккаунт</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Все билеты, заказы и история обнулятся. Отменить нельзя.
            </div>
          </div>
          {!delOpen ? (
            <button
              type="button"
              onClick={() => setDelOpen(true)}
              className="inline-flex items-center gap-1.5 border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-red-400 transition-colors hover:bg-red-500/20"
            >
              <Trash2 className="h-3 w-3" /> Удалить
            </button>
          ) : (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Введи свой ник «{myNick}» для подтверждения
                </Label>
                <Input value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setDelOpen(false); setDelConfirm(""); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={!delMatch || deleteMut.isPending}
                  className="inline-flex items-center gap-1.5 bg-red-500 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {deleteMut.isPending ? "…" : "Удалить навсегда"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
