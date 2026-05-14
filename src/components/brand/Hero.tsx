import pinkR6 from "@/assets/pink-r6.jpg";

/**
 * Hero — HELLHOUND Racing Club.
 * Журнальный индекс: слева содержание разделов сайта, справа фото активного розыгрыша.
 * Без слоганов. Только структура, факты и одна кнопка.
 */

const SECTIONS: {
  num: string;
  title: string;
  href: string;
  tag: string;
  live?: boolean;
  muted?: boolean;
}[] = [
  { num: "01", title: "Мерч", href: "#drop", tag: "COLLECTION 01" },
  { num: "02", title: "Гараж", href: "#club", tag: "SOON", muted: true },
  { num: "03", title: "Розыгрыш", href: "#raffle", tag: "LIVE", live: true },
  { num: "04", title: "Школа", href: "#school", tag: "SOON", muted: true },
  { num: "05", title: "Чат", href: "#chat", tag: "SOON", muted: true },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-12 md:py-32">
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-12 lg:grid-cols-12 lg:gap-24">
        {/* LEFT — INDEX */}
        <div className="flex flex-col justify-between py-2 lg:col-span-5">
          <div className="flex flex-col">
            <header className="mb-16 lg:mb-20">
              <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                Index v.01 / 2024
              </div>
              <div className="text-xl font-light uppercase tracking-tight">
                HELLHOUND Racing Club
              </div>
            </header>

            <nav className="flex flex-col border-b border-border">
              {SECTIONS.map((s) => (
                <a
                  key={s.num}
                  href={s.href}
                  className="group flex items-baseline justify-between border-t border-border py-5 transition-colors hover:bg-primary/[0.04]"
                >
                  <div className="flex items-baseline gap-6">
                    <span
                      className={`font-mono text-[10px] transition-colors ${
                        s.live
                          ? "font-bold text-primary"
                          : "text-muted-foreground/50 group-hover:text-primary"
                      }`}
                    >
                      {s.num}
                    </span>
                    <span
                      className={`text-xl font-light tracking-tight ${
                        s.muted ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                      s.live
                        ? "animate-pulse text-primary"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {s.tag}
                  </span>
                </a>
              ))}
            </nav>
          </div>

          <div className="mt-16 lg:mt-24">
            <button type="button" className="group inline-flex flex-col">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-sm font-light uppercase tracking-[0.2em] transition-colors group-hover:text-primary">
                  Войти
                </span>
                <div className="h-px w-8 bg-border transition-all duration-500 group-hover:w-12 group-hover:bg-primary" />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                Entry cost: 0 ₽
              </span>
            </button>
          </div>
        </div>

        {/* RIGHT — IMAGE */}
        <div className="relative flex flex-col lg:col-span-7">
          <div className="group relative aspect-[3/4] overflow-hidden bg-surface lg:aspect-auto lg:flex-grow">
            <img
              src={pinkR6}
              alt="Project Pink R6 — Yamaha YZF-R6, активный розыгрыш"
              width={1200}
              height={1600}
              className="h-full w-full object-cover opacity-90 grayscale-[0.2] transition-all duration-1000 group-hover:opacity-100 group-hover:grayscale-0"
            />
            <div className="absolute right-6 top-6 text-right">
              <div className="mb-1 font-mono text-[10px] leading-none text-muted-foreground/60">
                REF NO. PNK-R6-01
              </div>
              <div className="font-mono text-[10px] leading-none text-muted-foreground/60">
                YAMAHA MOTOR CO.
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4">
            <div className="flex flex-col">
              <span className="mb-1 font-mono text-[9px] uppercase text-muted-foreground/50">
                Project
              </span>
              <span className="text-[11px] tracking-tight text-foreground/80">
                Project Pink R6
              </span>
            </div>
            <div className="flex flex-col">
              <span className="mb-1 font-mono text-[9px] uppercase text-muted-foreground/50">
                Location
              </span>
              <span className="text-[11px] tracking-tight text-foreground/80">
                Moscow Garage
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="mb-1 font-mono text-[9px] uppercase text-muted-foreground/50">
                Status
              </span>
              <span className="text-[11px] tracking-tight text-primary">
                In Rotation
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
