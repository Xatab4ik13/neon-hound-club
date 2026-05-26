import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { LEGAL } from "@/data/legal";

export const Route = createFileRoute("/shop-info")({
  head: () => ({
    meta: [
      { title: "Оплата и доставка — HELLHOUND Racing Club" },
      { name: "description", content: "Способы оплаты (VISA, Mastercard, МИР), безопасность платежей, сроки и стоимость доставки СДЭК и Почтой России." },
      { property: "og:title", content: "Оплата и доставка — HELLHOUND Racing Club" },
      { property: "og:description", content: "VISA, Mastercard, МИР. СДЭК и Почта России по всей РФ." },
    ],
  }),
  component: ShopInfoPage,
});

/* ===================== Brand SVG marks ===================== */

function VisaMark() {
  return (
    <svg viewBox="0 0 80 28" className="h-7 w-auto" aria-label="VISA">
      <text
        x="0"
        y="22"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="26"
        fontStyle="italic"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="-1"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg viewBox="0 0 60 36" className="h-9 w-auto" aria-label="Mastercard">
      <circle cx="22" cy="18" r="14" fill="#EB001B" />
      <circle cx="38" cy="18" r="14" fill="#F79E1B" />
      <path
        d="M30 7.5a14 14 0 010 21 14 14 0 010-21z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function MirMark() {
  return (
    <svg viewBox="0 0 80 28" className="h-7 w-auto" aria-label="МИР">
      <text
        x="0"
        y="22"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="24"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="0"
      >
        МИР
      </text>
    </svg>
  );
}

/* ===================== Icons ===================== */

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="1.5" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}
function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}

/* ===================== Page ===================== */

export default function ShopInfoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 18px)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6 pt-32 pb-20 md:pt-40 md:pb-24">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Покупателям
          </div>
          <h1 className="max-w-3xl text-balance font-display text-5xl uppercase leading-[0.95] tracking-tight md:text-7xl">
            Оплата <span className="text-primary">и</span> доставка
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Платим картой — получаем посылку СДЭК или Почтой России. Без
            танцев с бубном. Ниже — как именно это работает.
          </p>
        </div>
      </section>

      {/* PAYMENT METHODS */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHead eyebrow="01 — Оплата" title="Принимаем к оплате" />

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <PaymentCard name="VISA" sub="International">
              <div className="text-foreground"><VisaMark /></div>
            </PaymentCard>
            <PaymentCard name="Mastercard" sub="Worldwide">
              <MastercardMark />
            </PaymentCard>
            <PaymentCard name="МИР" sub="НСПК">
              <div className="text-foreground"><MirMark /></div>
            </PaymentCard>
          </div>

          {/* Timeline */}
          <h3 className="mt-16 mb-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Как проходит платёж
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <StepCard
              n="01"
              title="Жмёшь «Оплатить»"
              text="После оформления заказа система перенаправит на защищённую страницу банка-эквайера."
            />
            <StepCard
              n="02"
              title="Подтверждаешь платёж"
              text="Вводишь данные карты и подтверждаешь кодом из SMS или Push от твоего банка."
            />
            <StepCard
              n="03"
              title="Возвращаешься на сайт"
              text="Заказ переходит в статус «Оплачен» и уходит в обработку. На почту приходит подтверждение и чек."
            />
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHead eyebrow="02 — Безопасность" title="Карта остаётся у банка" />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureCard icon={<LockIcon />} title="TLS-шифрование">
              Данные карты передаются на сервер банка по защищённому каналу
              в зашифрованном виде.
            </FeatureCard>
            <FeatureCard icon={<ShieldIcon />} title="PCI DSS">
              Платёжная страница соответствует международному стандарту
              безопасности приёма карт.
            </FeatureCard>
            <FeatureCard icon={<ReceiptIcon />} title="Чек по 54-ФЗ">
              После оплаты на email приходит подтверждение заказа и кассовый
              чек отдельным письмом.
            </FeatureCard>
          </div>

          <div className="mt-8 rounded-md border border-primary/30 bg-background/60 p-5 font-mono text-[12px] leading-relaxed text-foreground/85">
            <span className="text-primary">⌘ </span>
            Сайт и магазин <strong className="text-foreground">не получают и не хранят</strong> номер
            карты, срок действия и CVV/CVC. Эта информация известна только
            твоему банку и платёжной системе.
          </div>
        </div>
      </section>

      {/* DELIVERY */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHead eyebrow="03 — Доставка" title="Везём по всей России" />

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <CarrierCard
              tag="Основной"
              name="СДЭК"
              text="До пункта выдачи или курьером до двери. Доступно во всех городах присутствия СДЭК на территории РФ."
            />
            <CarrierCard
              tag="По согласованию"
              name="Почта России"
              text="Для населённых пунктов, где нет СДЭК. Оформляется через поддержку после оплаты."
            />
          </div>

          {/* Сроки */}
          <h3 className="mt-16 mb-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Ориентировочные сроки
          </h3>
          <div className="overflow-hidden rounded-md border border-border">
            <DeliveryRow region="Москва и МО" days="1–3 рабочих дня" />
            <DeliveryRow region="Города-миллионники" days="3–7 рабочих дней" />
            <DeliveryRow region="Остальные регионы РФ" days="5–14 рабочих дней" last />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Точный срок и стоимость рассчитываются автоматически на этапе
            оформления заказа исходя из тарифов СДЭК и веса посылки. Итоговая
            сумма с доставкой отображается до подтверждения оплаты.
          </p>

          {/* Получение */}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <FeatureCard icon={<TruckIcon />} title="Получение">
              После передачи заказа в службу доставки придёт трек-номер. В
              пункте выдачи СДЭК для получения нужен документ, удостоверяющий
              личность, и номер отправления.
            </FeatureCard>
            <FeatureCard icon={<MailIcon />} title="Если не пришло">
              Срок доставки истёк, а посылки нет — пиши в Telegram-поддержку.
              Свяжемся со службой доставки и разберёмся.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* RETURN */}
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHead eyebrow="04 — Возврат" title="Деньги — на ту же карту" />
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Возврат денежных средств производится на ту же банковскую карту,
            с которой была произведена оплата. Срок зачисления — от 1 до 30
            рабочих дней (зависит от банка-эмитента). Условия и порядок —
            в публичной оферте.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/legal/offer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors hover:border-primary hover:text-primary"
            >
              Публичная оферта →
            </Link>
            <Link
              to="/legal/privacy"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors hover:border-primary hover:text-primary"
            >
              Политика ПДн →
            </Link>
            <Link
              to="/legal/requisites"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors hover:border-primary hover:text-primary"
            >
              Реквизиты продавца →
            </Link>
          </div>
        </div>
      </section>

      {/* SUPPORT */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHead eyebrow="05 — Связь" title="Если что-то пошло не так" />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <a
              href={LEGAL.contactTelegram}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-md border border-border bg-surface p-6 transition-colors hover:border-primary"
            >
              <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Оперативно
              </div>
              <div className="font-display text-2xl uppercase tracking-tight">
                Telegram-поддержка
              </div>
              <div className="mt-2 font-mono text-sm text-primary">@hell666hound</div>
              <div className="mt-4 text-sm text-muted-foreground">
                Заказы, возвраты, доставка, технические вопросы.
              </div>
            </a>
            <a
              href={`mailto:${LEGAL.contactEmail}`}
              className="group relative overflow-hidden rounded-md border border-border bg-surface p-6 transition-colors hover:border-primary"
            >
              <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Официально
              </div>
              <div className="font-display text-2xl uppercase tracking-tight">
                Email
              </div>
              <div className="mt-2 font-mono text-sm text-primary">{LEGAL.contactEmail}</div>
              <div className="mt-4 text-sm text-muted-foreground">
                Документы, обращения по 152-ФЗ, претензии.
              </div>
            </a>
          </div>

          <p className="mt-12 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Продавец: {LEGAL.shortName} · ОГРНИП {LEGAL.ogrnip} · ИНН {LEGAL.inn} · {LEGAL.region}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ===================== Subcomponents ===================== */

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-primary">
        {eyebrow}
      </div>
      <h2 className="text-balance font-display text-3xl uppercase tracking-tight md:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function PaymentCard({
  name,
  sub,
  children,
}: {
  name: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative flex h-32 items-center justify-between overflow-hidden rounded-md border border-border bg-surface px-6 transition-colors hover:border-primary/60">
      <div>
        <div className="font-display text-xl uppercase tracking-tight">{name}</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {sub}
        </div>
      </div>
      <div className="flex h-14 w-20 items-center justify-end">{children}</div>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary transition-all duration-500 group-hover:w-full"
      />
    </div>
  );
}

function StepCard({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="relative rounded-md border border-border bg-surface p-6">
      <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">{n}</div>
      <div className="mb-2 font-display text-lg uppercase tracking-tight">{title}</div>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-6">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="mb-2 font-display text-lg uppercase tracking-tight">{title}</div>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function CarrierCard({ tag, name, text }: { tag: string; name: string; text: string }) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-surface p-6">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {tag}
      </div>
      <div className="font-display text-3xl uppercase tracking-tight">{name}</div>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function DeliveryRow({ region, days, last }: { region: string; days: string; last?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between bg-surface/60 px-5 py-4 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <div className="text-sm text-foreground">{region}</div>
      <div className="font-mono text-[12px] uppercase tracking-widest text-primary">{days}</div>
    </div>
  );
}
