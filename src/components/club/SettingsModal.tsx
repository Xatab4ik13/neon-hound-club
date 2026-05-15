import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ME } from "@/data/profile";
import { Bike, MapPin, Bell, ShieldAlert, LogOut, Trash2, User } from "lucide-react";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function SettingsModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border border-white/10 bg-[#0b0b0b] p-0 text-foreground">
        <div className="border-b border-white/[0.06] px-6 py-4">
          <DialogTitle className="font-display text-lg font-black uppercase italic tracking-tight">
            Настройки
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Профиль · доставка · уведомления · аккаунт
          </DialogDescription>
        </div>

        <Tabs defaultValue="profile" className="flex flex-col md:flex-row">
          <TabsList className="h-auto w-full shrink-0 flex-row gap-0 rounded-none border-b border-white/[0.06] bg-transparent p-0 md:w-52 md:flex-col md:border-b-0 md:border-r">
            <TabTrigger value="profile" icon={<User className="h-3.5 w-3.5" />}>Профиль и байк</TabTrigger>
            <TabTrigger value="address" icon={<MapPin className="h-3.5 w-3.5" />}>Доставка</TabTrigger>
            <TabTrigger value="notify" icon={<Bell className="h-3.5 w-3.5" />}>Уведомления</TabTrigger>
            <TabTrigger value="account" icon={<ShieldAlert className="h-3.5 w-3.5" />}>Аккаунт</TabTrigger>
          </TabsList>

          <div className="max-h-[70vh] flex-1 overflow-y-auto">
            <TabsContent value="profile" className="m-0 p-6"><ProfileTab /></TabsContent>
            <TabsContent value="address" className="m-0 p-6"><AddressTab /></TabsContent>
            <TabsContent value="notify" className="m-0 p-6"><NotifyTab /></TabsContent>
            <TabsContent value="account" className="m-0 p-6"><AccountTab /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function TabTrigger({ value, icon, children }: { value: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="flex flex-1 items-center justify-start gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-foreground data-[state=active]:shadow-none md:flex-none md:border-b-0 md:border-l-2"
    >
      {icon}
      <span>{children}</span>
    </TabsTrigger>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</Label>
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
      className="inline-flex items-center gap-2 bg-primary px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary-foreground transition-opacity hover:opacity-90"
    >
      {children}
    </button>
  );
}

// ---------- Profile + bike ----------
function ProfileTab() {
  const [nick, setNick] = useState(ME.nick);
  const [city, setCity] = useState(ME.city);
  const [bike, setBike] = useState(ME.bike);
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Профиль</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ник"><Input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={32} /></Field>
          <Field label="Город"><Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={64} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Аватар">
            <button type="button" className="flex items-center gap-3 border border-dashed border-white/10 bg-card/30 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
              <span className="flex h-10 w-10 items-center justify-center bg-primary/20 font-display text-base font-black italic uppercase text-primary">
                {nick.slice(0, 2)}
              </span>
              Загрузить новое фото
            </button>
          </Field>
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-6">
        <SectionTitle>Текущий байк</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Марка и модель"><Input value={bike} onChange={(e) => setBike(e.target.value)} placeholder="Yamaha MT-09" /></Field>
          <Field label="Год"><Input type="number" defaultValue={2022} min={1950} max={2026} /></Field>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Управление гаражом — на странице <Bike className="-mt-0.5 inline h-3 w-3" /> «Мой гараж».
        </p>
      </div>

      <div className="flex justify-end border-t border-white/[0.06] pt-4">
        <PrimaryButton>Сохранить</PrimaryButton>
      </div>
    </div>
  );
}

// ---------- Address (СДЭК) ----------
function AddressTab() {
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Адрес доставки</SectionTitle>
        <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Доставка только СДЭК. Используется для мерча и призов.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
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
          <Field label="Комментарий"><Input placeholder="Код домофона, этаж…" /></Field>
        </div>
      </div>

      <div className="flex justify-end border-t border-white/[0.06] pt-4">
        <PrimaryButton>Сохранить адрес</PrimaryButton>
      </div>
    </div>
  );
}

// ---------- Notifications ----------
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
      <div className="mb-3 flex items-baseline justify-between border-b border-white/[0.06] pb-2">
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

// ---------- Account / danger ----------
function AccountTab() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Аккаунт</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email"><Input type="email" defaultValue="hellhound@example.com" /></Field>
          <Field label="Telegram"><Input placeholder="@username" /></Field>
        </div>
        <div className="mt-4">
          <button type="button" className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
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
        <div className="flex items-center justify-between gap-4 border-b border-red-500/20 py-3">
          <div className="min-w-0">
            <div className="text-sm text-foreground">Выйти из аккаунта</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Завершить сессию на этом устройстве
            </div>
          </div>
          <button type="button" className="inline-flex items-center gap-1.5 border border-white/15 bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-foreground transition-colors hover:border-white/40">
            <LogOut className="h-3 w-3" /> Выйти
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="text-sm text-foreground">Удалить аккаунт</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Все билеты, заказы и история обнулятся. Отменить нельзя.
            </div>
          </div>
          <button type="button" className="inline-flex items-center gap-1.5 border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-red-400 transition-colors hover:bg-red-500/20">
            <Trash2 className="h-3 w-3" /> Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
