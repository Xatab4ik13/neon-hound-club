import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <Logo className="mb-4" />
            <p className="text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
              Андеграундная мото-культура
              <br />
              Основано MMXXVI / Без границ
            </p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Клуб
              </div>
              <ul className="space-y-2 text-xs uppercase tracking-wider">
                <li>
                  <Link to="/shop" className="transition-colors hover:text-primary">
                    Магазин
                  </Link>
                </li>
                <li>
                  <Link to="/hell-pass" className="transition-colors hover:text-primary">
                    Hell Pass
                  </Link>
                </li>
                <li>
                  <Link to="/school" className="transition-colors hover:text-primary">
                    Школа
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="transition-colors hover:text-primary">
                    О клубе
                  </Link>
                </li>
                <li>
                  <Link to="/news" className="transition-colors hover:text-primary">
                    Новости
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Соцсети
              </div>
              <ul className="space-y-2 text-xs uppercase tracking-wider">
                <li>
                  <a
                    href="https://www.youtube.com/@HELLHOUNDRacing"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-primary"
                  >
                    YouTube
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/hellhound_racing"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-primary"
                  >
                    Telegram
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/hellhound.racing"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-primary"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.twitch.tv/hellhoundracing"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-primary"
                  >
                    Twitch
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col justify-between text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              © 2026 HELLHOUND RACING CLUB. Все права защищены.
            </div>
            <div className="font-mono text-[10px] text-primary">
              ПИНГ: 14MS // СТАТУС: В СЕТИ
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
