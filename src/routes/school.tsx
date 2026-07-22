import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import stanislavAsset from "@/assets/instructors/stanislav.webp.asset.json";
import semenAsset from "@/assets/instructors/semen.webp.asset.json";
import nikitaAsset from "@/assets/instructors/nikita.webp.asset.json";
import pavelAsset from "@/assets/instructors/pavel.webp.asset.json";
import haixAsset from "@/assets/instructors/haix.webp.asset.json";



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
  photo: string;
  city: string;
  experience: number;
  // Оттенок фоновой рамки-плашки — чтобы карточки не сливались.
  tone: "primary" | "yellow" | "cyan" | "lime" | "violet";
};

const INSTRUCTORS: Instructor[] = [
  { id: "stanislav", name: "Станислав", photo: stanislavAsset.url, city: "Краснодар", experience: 10, tone: "primary" },
  { id: "semen",     name: "Семён",     photo: semenAsset.url,     city: "Краснодар", experience: 11, tone: "yellow" },
  { id: "nikita",    name: "Никита",    photo: nikitaAsset.url,    city: "Москва",    experience: 6,  tone: "cyan" },
  { id: "pavel",     name: "Павел",     photo: pavelAsset.url,     city: "Москва",    experience: 3,  tone: "lime" },
  { id: "haix",      name: "HaiX",      photo: haixAsset.url,      city: "Москва",    experience: 6,  tone: "violet" },
];

const TONE_BG: Record<Instructor["tone"], string> = {
  primary: "bg-primary",
  yellow: "bg-[#FFD93D]",
  cyan: "bg-[#3DDBD9]",
  lime: "bg-[#B6FF3C]",
  violet: "bg-[#C6A8FF]",
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="font-display text-7xl font-black uppercase leading-[0.88] tracking-tight text-foreground md:text-9xl">
        Скоро
      </div>
      <p className="mt-6 font-display text-2xl font-black uppercase tracking-tight text-muted-foreground md:text-4xl">
        Готовим программу
      </p>
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
        {/* Портрет инструктора */}
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          <img
            src={instructor.photo}
            alt={instructor.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />

          {/* Плашки с городом и стажем */}
          <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full border-2 border-foreground bg-card px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              {instructor.city}
            </span>
            <span className="rounded-full border-2 border-foreground bg-card px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              {instructor.experience} {instructor.experience < 5 ? "года" : "лет"} стажа
            </span>
          </div>
        </div>

        {/* Имя внизу карточки */}
        <div className="border-t-[3px] border-foreground bg-card px-4 py-3">
          <div className="font-display text-2xl font-black uppercase leading-none tracking-tight text-foreground">
            {instructor.name}
          </div>
        </div>

      </div>
    </article>
  );
}
