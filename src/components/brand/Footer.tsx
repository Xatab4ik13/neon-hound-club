import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <Logo className="mb-4" />
            <p className="text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
              Underground Motor Culture
              <br />
              Est. MMXXV / Zero Limits
            </p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Shop
              </div>
              <ul className="space-y-2 text-xs uppercase tracking-wider">
                <li>
                  <a href="#drop" className="transition-colors hover:text-primary">
                    Drops
                  </a>
                </li>
                <li>
                  <a href="#race-pass" className="transition-colors hover:text-primary">
                    Race Pass
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    Доставка
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Social
              </div>
              <ul className="space-y-2 text-xs uppercase tracking-wider">
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    YouTube
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    Telegram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col justify-between text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              © 2025 HELLHOUND RACING CLUB. ALL RIGHTS RESERVED.
            </div>
            <div className="font-mono text-[10px] text-primary">
              LATENCY: 14MS // STATUS: OPERATIONAL
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
