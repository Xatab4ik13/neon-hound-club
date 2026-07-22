import { Link } from "@tanstack/react-router";
import { PaymentBadges } from "./PaymentBadges";
import { LEGAL } from "@/data/legal";
import hhrLogo from "@/assets/hhr-logo.png.asset.json";
import youtubeIcon from "@/assets/social/youtube.svg";
import telegramIcon from "@/assets/social/telegram.svg";
import twitchIcon from "@/assets/social/twitch.svg";

const SOCIALS = [
  { label: "YouTube", href: "https://www.youtube.com/@HELLHOUNDRacing", icon: youtubeIcon },
  { label: "Telegram", href: "https://t.me/hell666hound", icon: telegramIcon },
  { label: "Twitch", href: "https://www.twitch.tv/hellhound", icon: twitchIcon },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-white text-black">
      <div className="mx-auto max-w-7xl px-6 pt-14 pb-8">
        {/* Логотип по центру */}
        <div className="flex justify-center">
          <img
            src={hhrLogo.url}
            alt="HELLHOUND Racing"
            className="h-20 w-auto md:h-24"
          />
        </div>

        {/* Соцсети — Plump плашки */}
        <div className="mt-8 flex justify-center gap-4">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="grid h-14 w-14 place-items-center rounded-2xl border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000] active:translate-y-0 active:shadow-[2px_2px_0_0_#000]"
            >
              <img src={s.icon} alt="" className="h-6 w-6" />
            </a>
          ))}
        </div>

        {/* верхний блок */}
        <div className="mt-12 grid gap-10 md:grid-cols-12">
          {/* навигация */}
          <div className="md:col-span-4">
            <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
              Клуб
            </div>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/shop" className="transition-colors hover:text-primary">Магазин</Link></li>
              <li><Link to="/hell-pass" className="transition-colors hover:text-primary">Hell Pass</Link></li>
              <li><Link to="/school" className="transition-colors hover:text-primary">Школа</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-primary">О клубе</Link></li>
            </ul>
          </div>

          {/* документы */}
          <div className="md:col-span-8">
            <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
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

            <div className="mt-6">
              <a
                href={`mailto:${LEGAL.contactEmail}`}
                className="inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-black/60 transition-colors hover:text-primary"
              >
                {LEGAL.contactEmail}
              </a>
            </div>
          </div>
        </div>

        {/* разделитель */}
        <div className="mt-12 border-t-[3px] border-black" />

        {/* платёжные системы */}
        <div className="mt-6 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-black/50">
              Принимаем
            </span>
            <PaymentBadges size="sm" />
          </div>
          <Link
            to="/shop-info"
            className="font-mono text-[11px] uppercase tracking-widest text-black/60 transition-colors hover:text-primary"
          >
            Оплата и доставка →
          </Link>
        </div>

        {/* нижняя строка: реквизиты ИП по 152-ФЗ */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="font-mono text-[11px] leading-relaxed text-black/60">
            {LEGAL.shortName} · ОГРНИП {LEGAL.ogrnip} · ИНН {LEGAL.inn}
            <span className="hidden md:inline"> · {LEGAL.addressShort}</span>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-black/60">
            © {year} {LEGAL.brand}
          </div>
        </div>
      </div>
    </footer>
  );
}
