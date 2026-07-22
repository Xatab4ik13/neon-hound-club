import { Link } from "@tanstack/react-router";
import { LEGAL } from "@/data/legal";
import hhrLogo from "@/assets/hhr-logo.png.asset.json";
import youtubeIcon from "@/assets/social/youtube.svg";
import telegramIcon from "@/assets/social/telegram.svg";
import twitchIcon from "@/assets/social/twitch.svg";
import visaLogo from "@/assets/payments/visa.svg";
import mastercardLogo from "@/assets/payments/mastercard.svg";
import mirLogo from "@/assets/payments/mir.svg";

const SOCIALS = [
  { label: "YouTube", href: "https://www.youtube.com/@HELLHOUNDRacing", icon: youtubeIcon },
  { label: "Telegram", href: "https://t.me/hell666hound", icon: telegramIcon },
  { label: "Twitch", href: "https://www.twitch.tv/hellhound", icon: twitchIcon },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-white text-black">
      <div
        aria-hidden
        className="pointer-events-none h-12 w-full -mt-12 bg-gradient-to-b from-transparent to-white"
      />
      <div className="mx-auto max-w-7xl px-6 py-3">
        {/* Верх: логотип слева, соцсети справа */}
        <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
          <img
            src={hhrLogo.url}
            alt="HELLHOUND Racing"
            className="h-11 w-auto md:h-12"
          />

          <div className="flex gap-2.5">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="grid h-9 w-9 place-items-center rounded-lg border-[3px] border-black bg-white shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] active:translate-y-0 active:shadow-[1px_1px_0_0_#000]"
              >
                <img src={s.icon} alt="" className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Разделитель */}
        <div className="mt-2.5 border-t-[3px] border-black" />

        {/* Средний ряд: документы + платёжные логотипы */}
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <li><Link to="/legal/offer" className="transition-colors hover:text-primary">Оферта</Link></li>
            <li><Link to="/legal/terms" className="transition-colors hover:text-primary">Соглашение</Link></li>
            <li><Link to="/legal/privacy" className="transition-colors hover:text-primary">Политика ПДн</Link></li>
            <li><Link to="/legal/promo-rules" className="transition-colors hover:text-primary">Правила розыгрышей</Link></li>
            <li><Link to="/legal/requisites" className="transition-colors hover:text-primary">Реквизиты</Link></li>
          </ul>

          <div className="flex items-center gap-2.5">
            <img src={visaLogo} alt="Visa" className="h-5 w-auto" />
            <img src={mastercardLogo} alt="Mastercard" className="h-6 w-auto" />
            <img src={mirLogo} alt="МИР" className="h-4 w-auto" />
          </div>
        </div>

        {/* Низ: реквизиты + копирайт */}
        <div className="mt-2 flex flex-col gap-1 font-mono text-[10px] text-black/60 md:flex-row md:items-center md:justify-between">
          <div>
            {LEGAL.shortName} · ОГРНИП {LEGAL.ogrnip} · ИНН {LEGAL.inn}
          </div>
          <div className="uppercase tracking-widest">
            © {year} {LEGAL.brand}
          </div>
        </div>
      </div>
    </footer>
  );
}
