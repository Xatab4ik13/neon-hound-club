import { PlumpAI, PlumpGarage, PlumpStore, PlumpTicket, PlumpDiamond } from "@/components/ui/icons";
import vanyaAsset from "@/assets/vanya-helmet.webp";
import phoneAsset from "@/assets/phone-mockup.webp";

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
    title: "Мерч",
    desc: "Лимитированные дропы, размеры в наличии и предзаказы — без сторонних магазинов.",
  },
  {
    icon: PlumpTicket,
    title: "Розыгрыши",
    desc: "Билеты за активность и покупки. Участвуй в розыгрышах мерча и Pass.",
  },
  {
    icon: PlumpDiamond,
    title: "Hell Pass",
    desc: "30 дней доступа к AI, квестам и бонусам. Без автопродления — продлеваешь сам.",
  },
];

export function AppShowcase() {
  return (
    <section id="app" className="relative overflow-hidden bg-surface px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Заголовок */}
        <div className="mb-8 md:mb-12">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            Мобильное приложение
          </div>
          <h2 className="max-w-[14ch] font-display text-4xl uppercase tracking-tighter md:text-5xl lg:text-6xl">
            Всё клубное в телефоне
          </h2>
        </div>

        {/* Композиция */}
        <div className="relative flex min-h-[600px] flex-col items-center md:min-h-[720px] lg:min-h-[520px] lg:flex-row lg:items-center">
          {/* Ваня — слева, прижат к низу */}
          <img
            src={vanyaAsset}
            alt="Ваня — HELLHOUND Racing"
            width={1264}
            height={848}
            loading="lazy"
            className="pointer-events-none absolute bottom-0 left-0 z-0 h-auto w-[50%] max-w-[240px] -translate-x-[5%] translate-y-[4%] object-contain md:w-[38%] md:max-w-[320px] md:-translate-x-[6%] lg:w-[26%] lg:max-w-[340px] lg:-translate-x-[8%] lg:translate-y-[6%]"
          />

          {/* Телефон — центр */}
          <div className="relative z-10 mx-auto w-[200px] shrink-0 pt-2 md:w-[260px] lg:absolute lg:left-[24%] lg:top-1/2 lg:w-[300px] lg:-translate-y-1/2">
            <img
              src={phoneAsset}
              alt="Мокап приложения HELLHOUND"
              width={1024}
              height={1024}
              loading="lazy"
              className="h-auto w-full drop-shadow-2xl"
            />
            {/* Экран-заглушка */}
            <div className="absolute left-[7%] top-[3%] -z-10 h-[94%] w-[86%] rounded-[2.2rem] bg-black md:rounded-[2.8rem]" />
          </div>

          {/* Плашки с фичами — справа */}
          <div className="relative z-20 mt-12 grid w-full gap-3 sm:grid-cols-2 lg:ml-auto lg:mt-0 lg:w-[46%] lg:pl-6">
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

        {/* Подсказка про скриншот */}
        <p className="relative z-20 mt-10 max-w-[50ch] text-sm text-muted-foreground md:mt-14">
          Скоро сюда подложим реальные скриншоты из приложения. Пока смотрим на композицию и текст.
        </p>
      </div>
    </section>
  );
}
