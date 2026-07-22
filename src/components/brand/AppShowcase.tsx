import { PlumpAI, PlumpGarage, PlumpStore, PlumpTicket, PlumpSchool, PlumpFeed } from "@/components/ui/icons";
import phoneLarge from "@/assets/phone-mockup-hhr.webp.asset.json";

const FEATURES = [
  {
    icon: PlumpAI,
    title: "Hell AI",
    desc: "AI-механик по твоему мото. Отвечает на вопросы, подсказывает по обслуживанию и ремонту.",
  },
  {
    icon: PlumpGarage,
    title: "Гараж",
    desc: "Добавляй байки, храни историю обслуживания, ТО и траты в одном месте.",
  },
  {
    icon: PlumpStore,
    title: "Магазин",
    desc: "Мерч, амуниция и предзаказы. Всё в одном месте — без сторонних магазинов.",
  },
  {
    icon: PlumpTicket,
    title: "Розыгрыши",
    desc: "Билеты за активность и покупки. Участвуй в розыгрышах мотоциклов и крупных призов от амбассадоров клуба.",
  },
  {
    icon: PlumpSchool,
    title: "Школа",
    desc: "Выбери инструктора в своём городе или смотри видеокурсы, чтобы ездить увереннее.",
  },
  {
    icon: PlumpFeed,
    title: "Новости",
    desc: "Самые свежие новости из мира мотоспорта — коротко и по делу.",
  },
];

export function AppShowcase() {
  return (
    <section id="app" className="relative overflow-hidden bg-background px-6 py-16 md:py-40">
      {/* Мягкое розовое свечение за мокапом */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 h-[75vh] w-[75vh] -translate-y-1/2 translate-x-1/4 rounded-full bg-primary/15 blur-[130px]"
      />

      <div className="relative w-full px-6 md:px-8">
        {/* Заголовок */}
        <div className="mb-8 md:mb-12">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            Мобильное приложение
          </div>
          <h2 className="max-w-[14ch] font-display text-4xl uppercase tracking-tighter md:text-5xl lg:text-6xl">
            Всё клубное в телефоне
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
          {/* Мокап телефона — на мобилке сверху, на десктопе справа */}
          <div className="relative order-1 flex items-center justify-center lg:order-2 lg:justify-end">
            <img
              src={phoneLarge.url}
              alt="Мокап приложения HELLHOUND"
              width={1024}
              height={1024}
              loading="lazy"
              className="relative h-auto w-full max-w-[520px] scale-110 object-contain drop-shadow-2xl sm:max-w-[640px] sm:scale-105 md:max-w-[780px] md:scale-100 lg:max-w-[890px]"
            />
          </div>

          {/* Фичи — на мобилке снизу, на десктопе слева */}
          <div className="order-2 grid gap-3 sm:grid-cols-2 lg:order-1">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border-[3px] border-foreground bg-card p-4 shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_hsl(var(--foreground))] sm:p-5"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-foreground bg-primary text-primary-foreground">
                      <Icon size={22} />
                    </span>
                    <h3 className="font-display text-lg uppercase tracking-tight">{f.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
