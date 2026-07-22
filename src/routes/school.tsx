import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { PlumpNum } from "@/components/brand/PlumpNum";

export const Route = createFileRoute("/school")({
  head: () => ({
    meta: [
      { title: "Школа HELLHOUND — онлайн-курсы и инструкторы" },
      {
        name: "description",
        content:
          "Школа HELLHOUND. Онлайн-курсы и живые инструкторы в городах. Учись у тех, кто реально катает.",
      },
      { property: "og:title", content: "Школа HELLHOUND" },
      {
        property: "og:description",
        content: "Онлайн-курсы и живые инструкторы. Учись у тех, кто катает.",
      },
      { property: "og:url", content: "/school" },
    ],
    links: [{ rel: "canonical", href: "/school" }],
  }),
  component: SchoolPage,
});

type Instructor = {
  id: string;
  name: string;
  city: string;
  specialization: string;
  experience: string;
  // Оттенок фоновой рамки-плашки — чтобы карточки не сливались.
  tone: "primary" | "yellow" | "cyan" | "lime";
};

// MOCK — реальные инструктора появятся позже.
const INSTRUCTORS: Instructor[] = [
  {
    id: "1",
    name: "Ваня",
    city: "Москва",
    specialization: "Спорт / трек",
    experience: "10 лет",
    tone: "primary",
  },
  {
    id: "2",
    name: "Макс",
    city: "Санкт-Петербург",
    specialization: "Новичкам",
    experience: "6 лет",
    tone: "yellow",
  },
  {
    id: "3",
    name: "Дима",
    city: "Сочи",
    specialization: "Эндуро / офф-роуд",
    experience: "8 лет",
    tone: "cyan",
  },
  {
    id: "4",
    name: "Артём",
    city: "Казань",
    specialization: "Городская езда",
    experience: "5 лет",
    tone: "lime",
  },
];

const TONE_BG: Record<Instructor["tone"], string> = {
  primary: "bg-primary",
  yellow: "bg-[#FFD93D]",
  cyan: "bg-[#3DDBD9]",
  lime: "bg-[#B6FF3C]",
};

function SchoolPage() {
  const [mode, setMode] = useState<"online" | "offline">("offline");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 md:pt-32">
        {/* HEADER */}
        <div className="text-center">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            Школа
          </p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.88] tracking-tight md:text-7xl">
            Школа HELLHOUND
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-mono text-xs uppercase tracking-widest text-muted-foreground md:text-sm">
            Учись у тех, кто реально катает
          </p>
        </div>


        {/* SEGMENTED TOGGLE — plump */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-2xl border-[3px] border-foreground bg-card p-1 shadow-[6px_6px_0_0_hsl(var(--foreground))]">
            <button
              type="button"
              onClick={() => setMode("online")}
              className={`rounded-xl px-5 py-2.5 font-display text-xs font-black uppercase tracking-widest transition-colors md:text-sm ${
                mode === "online"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:text-primary"
              }`}
            >
              Онлайн-курсы
            </button>
            <button
              type="button"
              onClick={() => setMode("offline")}
              className={`rounded-xl px-5 py-2.5 font-display text-xs font-black uppercase tracking-widest transition-colors md:text-sm ${
                mode === "offline"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:text-primary"
              }`}
            >
              Инструкторы
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="mt-12">
          {mode === "online" ? <OnlineSoon /> : <InstructorsGrid />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function OnlineSoon() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div className="rounded-2xl border-[3px] border-foreground bg-card px-8 py-10 shadow-[8px_8px_0_0_hsl(var(--foreground))] md:px-14 md:py-14">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
          Онлайн-курсы
        </p>
        <div className="font-display text-5xl font-black uppercase italic tracking-tight md:text-7xl">
          Скоро
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Готовим программу
        </p>
      </div>
    </div>
  );
}

function InstructorsGrid() {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {INSTRUCTORS.map((it, i) => (
        <InstructorCard key={it.id} instructor={it} index={i} />
      ))}
    </div>
  );
}

function InstructorCard({
  instructor,
  index,
}: {
  instructor: Instructor;
  index: number;
}) {
  // Чередуем лёгкий наклон карточкам для «живого» ощущения.
  const skew = index % 2 === 0 ? "-rotate-1" : "rotate-1";
  return (
    <article className={`group relative ${skew}`}>
      {/* Толстая plump-рамка */}
      <div
        className={`relative overflow-hidden rounded-3xl border-[3px] border-foreground ${TONE_BG[instructor.tone]} shadow-[8px_8px_0_0_hsl(var(--foreground))] transition-transform duration-200 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_hsl(var(--foreground))]`}
      >
        {/* Портрет-плейсхолдер (силуэт). Заменится реальными вырезанными фото. */}
        <div className="relative aspect-[3/4] w-full">
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/40" />
          <svg
            viewBox="0 0 200 260"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {/* Плечи + голова силуэтом */}
            <circle cx="100" cy="90" r="42" fill="hsl(var(--foreground))" fillOpacity="0.85" />
            <path
              d="M20 260 C 30 190, 70 160, 100 160 C 130 160, 170 190, 180 260 Z"
              fill="hsl(var(--foreground))"
              fillOpacity="0.85"
            />
          </svg>

          {/* Номер / стаж в углу */}
          <div className="absolute right-3 top-3 rounded-full border-[2px] border-foreground bg-card px-2.5 py-1">
            <PlumpNum value={String(index + 1).padStart(2, "0")} size={12} />
          </div>
        </div>

        {/* Имя внизу карточки */}
        <div className="border-t-[3px] border-foreground bg-card px-4 py-3">
          <div className="font-display text-2xl font-black uppercase italic leading-none tracking-tight text-foreground">
            {instructor.name}
          </div>
        </div>
      </div>

      {/* Плашки сверху/по краям — город, спец, стаж */}
      <div className="pointer-events-none absolute -top-3 left-3 -rotate-[4deg]">
        <PlumpTag>{instructor.city}</PlumpTag>
      </div>
      <div className="pointer-events-none absolute -right-2 top-10 rotate-[6deg]">
        <PlumpTag variant="dark">{instructor.specialization}</PlumpTag>
      </div>
      <div className="pointer-events-none absolute -bottom-3 right-6 -rotate-[3deg]">
        <PlumpTag variant="accent">Опыт {instructor.experience}</PlumpTag>
      </div>
    </article>
  );
}

function PlumpTag({
  children,
  variant = "light",
}: {
  children: React.ReactNode;
  variant?: "light" | "dark" | "accent";
}) {
  const styles =
    variant === "dark"
      ? "bg-foreground text-background"
      : variant === "accent"
        ? "bg-primary text-primary-foreground"
        : "bg-card text-foreground";
  return (
    <span
      className={`inline-block rounded-full border-[3px] border-foreground px-3 py-1 font-display text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_hsl(var(--foreground))] md:text-xs ${styles}`}
    >
      {children}
    </span>
  );
}
