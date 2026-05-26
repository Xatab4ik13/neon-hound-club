import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { PaymentBadges } from "./PaymentBadges";
import { LEGAL } from "@/data/legal";

const SOCIALS = [
  { label: "YouTube",  href: "https://www.youtube.com/@HELLHOUNDRacing" },
  { label: "Telegram", href: "https://t.me/hell666hound" },
  { label: "Twitch",   href: "https://www.twitch.tv/hellhound" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border bg-background">
      {/* верхний тонкий неоновый штрих */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 pt-14 pb-8">
        {/* верхний блок */}
        <div className="grid gap-12 md:grid-cols-12">
          {/* бренд */}
          <div className="md:col-span-4">
            <Logo className="mb-4" />
            <p className="max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
              Андеграундный мото-клуб HELLHOUND. Лимитированный мерч,
              Hell Pass, ранги, гараж и розыгрыши — без накруток.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              в&nbsp;сети · пинг 14&nbsp;ms
            </div>
          </div>

          {/* навигация */}
          <div className="md:col-span-2">
            <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Клуб
            </div>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/shop" className="transition-colors hover:text-primary">Магазин</Link></li>
              <li><Link to="/hell-pass" className="transition-colors hover:text-primary">Hell Pass</Link></li>
              <li><Link to="/school" className="transition-colors hover:text-primary">Школа</Link></li>
              
              <li><Link to="/about" className="transition-colors hover:text-primary">О клубе</Link></li>
            </ul>
          </div>

          {/* соцсети */}
          <div className="md:col-span-2">
            <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Соцсети
            </div>
            <ul className="space-y-2.5 text-sm">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 transition-colors hover:text-primary"
                  >
                    {s.label}
                    <span aria-hidden className="text-[10px] text-muted-foreground">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* документы */}
          <div className="md:col-span-4">
            <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Документы
            </div>
            <ul className="grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
              <li><Link to="/shop-info" className="transition-colors hover:text-primary">Оплата и доставка</Link></li>
             <li><Link to="/legal/offer" className="transition-colors hover:text-primary">Публичная оферта</Link></li>
             <li><Link to="/legal/terms" className="transition-colors hover:text-primary">Пользовательское соглашение</Link></li>
             <li><Link to="/legal/privacy" className="transition-colors hover:text-primary">Политика ПДн</Link></li>
             <li><Link to="/legal/promo-rules" className="transition-colors hover:text-primary">Правила розыгрышей</Link></li>
             <li><Link to="/legal/requisites" className="transition-colors hover:text-primary">Реквизиты</Link></li>
            </ul>

            <div className="mt-6 flex flex-col gap-2">
              <a
                href={LEGAL.contactTelegram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors hover:border-primary/60 hover:text-primary"
              >
                Поддержка · Telegram →
              </a>
              <a
                href={`mailto:${LEGAL.contactEmail}`}
                className="inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
              >
                {LEGAL.contactEmail}
              </a>
            </div>
          </div>
        </div>

        {/* разделитель */}
        <div className="mt-12 border-t border-border/60" />

        {/* платёжные системы */}
        <div className="mt-6 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Принимаем
            </span>
            <PaymentBadges size="sm" />
          </div>
          <Link
            to="/shop-info"
            className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
          >
            Оплата и доставка →
          </Link>
        </div>

        {/* нижняя строка: реквизиты ИП по 152-ФЗ */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            {LEGAL.shortName} · ОГРНИП {LEGAL.ogrnip} · ИНН {LEGAL.inn}
            <span className="hidden md:inline"> · {LEGAL.addressShort}</span>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            © {year} {LEGAL.brand}
          </div>
        </div>
      </div>
    </footer>
  );
}
