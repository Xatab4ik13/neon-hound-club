import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { INSTRUCTORS, TONE_BG, type Instructor } from "@/data/instructors";

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

function SchoolPage() {
  const [mode, setMode] = useState<"online" | "offline">("offline");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 md:pt-32">
        <div className="text-center">
          <h1 className="font-display text-5xl font-black uppercase leading-[0.88] tracking-tight md:text-7xl">
            Школа HELLHOUND
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-mono text-xs uppercase tracking-widest text-muted-foreground md:text-sm">
            Учись у тех, кто реально катает
          </p>
        </div>

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
    <div className="grid gap-10 pt-4 sm:grid-cols-2 lg:grid-cols-3">
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
  const skew = index % 2 === 0 ? "-rotate-1" : "rotate-1";
  const expLabel = `${instructor.experience} ${instructor.experience < 5 ? "года" : "лет"} стажа`;
  return (
    <Link
      to="/school/$instructorId"
      params={{ instructorId: instructor.slug }}
      className={`group relative block ${skew}`}
    >
      <div
        className={`relative overflow-hidden rounded-3xl border-[3px] border-foreground ${TONE_BG[instructor.tone]} shadow-[8px_8px_0_0_hsl(var(--foreground))] transition-transform duration-200 ease-out group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[10px_10px_0_0_hsl(var(--foreground))]`}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          <img
            src={instructor.photo}
            alt={instructor.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
        </div>

        <div className="border-t-[3px] border-foreground bg-card px-4 py-3">
          <div className="font-display text-2xl font-black uppercase leading-none tracking-tight text-foreground">
            {instructor.name}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -top-3 left-3 -rotate-[4deg]">
        <PlumpTag>{instructor.city}</PlumpTag>
      </div>
      <div className="pointer-events-none absolute -bottom-3 right-6 -rotate-[3deg]">
        <PlumpTag variant="accent">{expLabel}</PlumpTag>
      </div>
    </Link>
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
