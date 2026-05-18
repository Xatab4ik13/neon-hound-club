import { createFileRoute, Link } from "@tanstack/react-router";
import { Youtube, Send, Instagram, Twitch } from "lucide-react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О клубе — HELLHOUND Racing Club" },
      {
        name: "description",
        content:
          "HELLHOUND Racing Club — клуб райдеров вокруг YouTube-канала HELLHOUND. Hell Pass, мерч, школа, AI-механик. Юридический статус и контакты.",
      },
      { property: "og:title", content: "О клубе HELLHOUND" },
      {
        property: "og:description",
        content:
          "Клуб райдеров вокруг YouTube-канала HELLHOUND. Hell Pass, мерч, школа, AI-механик.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const SOCIALS = [
  { id: "yt", label: "YouTube", handle: "@HELLHOUNDRacing", url: "https://www.youtube.com/@HELLHOUNDRacing", Icon: Youtube },
  { id: "tg", label: "Telegram", handle: "@hellhound_racing", url: "https://t.me/hellhound_racing", Icon: Send },
  { id: "ig", label: "Instagram", handle: "@hellhound.racing", url: "https://www.instagram.com/hellhound.racing", Icon: Instagram },
  { id: "tw", label: "Twitch", handle: "hellhoundracing", url: "https://www.twitch.tv/hellhoundracing", Icon: Twitch },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 md:px-8">
        {/* Hero */}
        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            О клубе
          </p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase italic leading-[0.95] tracking-tighter md:text-6xl">
            HELLHOUND <span className="text-primary">Racing Club</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Клуб райдеров вокруг YouTube-канала HELLHOUND. Без понтов и
            закрытых дверей: место, где собирается своя аудитория канала —
            обсуждать мото, ездить вместе, забирать мерч и пользоваться
            полезными штуками, которых нет снаружи.
          </p>
        </section>

        {/* Что внутри */}
        <section className="mt-14">
          <h2 className="font-display text-xl uppercase tracking-tight text-muted-foreground">
            Что внутри
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              {
                t: "Hell Pass",
                d: "Клубная подписка с тремя тирами: Silver, Gold, Platinum. Билеты в розыгрыши, скидки на мерч и школу, эксклюзивы.",
              },
              {
                t: "Hell AI",
                d: "AI-механик по твоему мото. Заносишь свой байк — получаешь ответы по своей модели, а не общие.",
              },
              {
                t: "Мерч",
                d: "Лимитированный мерч HELLHOUND и вещи от партнёров. Кешбэк билетами после оплаты.",
              },
              {
                t: "Школа",
                d: "Курсы по городу, треку и контраварийной подготовке. Открытие скоро.",
              },
            ].map((b) => (
              <div
                key={b.t}
                className="border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="font-display text-lg uppercase tracking-tight">
                  {b.t}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Соцсети */}
        <section className="mt-14">
          <h2 className="font-display text-xl uppercase tracking-tight text-muted-foreground">
            Где мы есть
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {SOCIALS.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 border border-border bg-card p-4 transition-colors hover:border-primary/60"
                >
                  <span className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
                    <s.Icon className="size-5" strokeWidth={2} />
                  </span>
                  <span>
                    <span className="block font-display text-sm uppercase tracking-widest">
                      {s.label}
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {s.handle}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="ml-auto text-muted-foreground transition-colors group-hover:text-primary"
                  >
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Юридический блок */}
        <section className="mt-14 border-l-2 border-primary bg-card p-6 md:p-8">
          <h2 className="font-display text-xl uppercase tracking-tight">
            Юридический статус
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="text-foreground">Hell Pass</span> — платная
              клубная подписка. Оплачивая её, участник получает доступ к
              контенту клуба, скидкам, школе и сервисам (включая Hell AI),
              а также участие в стимулирующих акциях клуба.
            </p>
            <p>
              <span className="text-foreground">
                Розыгрыши среди подписчиков
              </span>{" "}
              — стимулирующие мероприятия для держателей действующей подписки
              Hell Pass. Отдельная плата за участие в розыгрыше не взимается.
              Результат розыгрыша не зависит от внесения участником
              дополнительных платежей. Победитель определяется случайным
              образом среди участников клуба.
            </p>
            <p>
              <span className="text-foreground">Билеты клуба</span> — внутренний
              учётный знак активности участника. Не являются ценной бумагой,
              цифровым финансовым активом, криптовалютой или средством платежа
              за пределами клуба и не имеют денежной стоимости при возврате.
            </p>
            <p className="text-xs">
              По вопросам, связанным с подпиской и розыгрышами, пишите на
              <a
                href="mailto:club@hellhound.racing"
                className="ml-1 text-primary underline-offset-4 hover:underline"
              >
                club@hellhound.racing
              </a>
              .
            </p>
          </div>
        </section>

        <section className="mt-14 text-center">
          <Button asChild>
            <Link to="/hell-pass">Посмотреть Hell Pass</Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
