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
        className="pointer-events-none h-24 w-full -mt-24 bg-gradient-to-b from-transparent to-white"
      />
      <div className="mx-auto max-w-7xl px-6 py-5">
        {/* Логотип слева, соцсети справа + копирайт в одном компактном ряду */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <img
            src={hhrLogo.url}
            alt="HELLHOUND Racing"
            className="h-10 w-auto md:h-11"
          />

          <div className="flex items-center gap-4">
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
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t-[3px] border-black pt-3 font-mono text-[10px] text-black/60 md:flex-row">
          <div className="uppercase tracking-widest">
            © {year} {LEGAL.brand}
          </div>
          <div className="flex gap-4">
            <Link to="/legal/offer" className="transition-colors hover:text-primary">Оферта</Link>
            <Link to="/legal/terms" className="transition-colors hover:text-primary">Соглашение</Link>
            <Link to="/legal/privacy" className="transition-colors hover:text-primary">Политика ПДн</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
