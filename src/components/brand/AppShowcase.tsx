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
        <div className="relative flex min-h-[560px] flex-col md:min-h-[720px] lg:min-h-[580px] lg:flex-row lg:items-center">
          {/* Ваня — слева. На мобильном вверху, на десктопе внизу позади телефона */}
          <img
            src={vanyaAsset}
            alt="Ваня — HELLHOUND Racing"
            width={1264}
            height={848}
            loading="lazy"
            className="pointer-events-none absolute left-0 top-[70px] z-10 h-auto w-[40%] max-w-[180px] -translate-x-[2%] object-contain md:bottom-0 md:top-auto md:w-[38%] md:max-w-[320px] md:-translate-x-[4%] lg:z-0 lg:w-[24%] lg:max-w-[300px] lg:-translate-x-[2%] lg:translate-y-0"
          />

          {/* Телефон — справа на мобильном, центр на десктопе */}
          <div className="absolute right-4 top-[60px] z-10 w-[150px] md:static md:mx-auto md:w-[250px] lg:absolute lg:left-[28%] lg:top-1/2 lg:w-[300px] lg:-translate-y-1/2">
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
