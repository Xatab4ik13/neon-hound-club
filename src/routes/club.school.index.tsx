import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/club/PageHeader";
import { PlumpArrowRight as ChevronRight } from "@/components/ui/icons";
import { INSTRUCTORS, type Instructor } from "@/data/instructors";

export const Route = createFileRoute("/club/school/")({
  head: () => ({
    meta: [
      { title: "Школа · HELLHOUND" },
      { name: "description", content: "Инструкторы и онлайн-курсы Школы HELLHOUND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubSchoolPage,
});

type Tab = "instructors" | "online";

function ClubSchoolPage() {
  const [tab, setTab] = useState<Tab>("instructors");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      <PageHeader title="Школа" subtitle="учись у тех, кто катает" />

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1">
        <TabBtn active={tab === "instructors"} onClick={() => setTab("instructors")}>
          Инструкторы
        </TabBtn>
        <TabBtn active={tab === "online"} onClick={() => setTab("online")}>
          Онлайн-курсы
        </TabBtn>
      </div>

      {tab === "instructors" ? <InstructorsList /> : <OnlineSoon />}
    </main>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function InstructorsList() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {INSTRUCTORS.map((it) => (
        <InstructorCard key={it.id} instructor={it} />
      ))}
    </div>
  );
}

function InstructorCard({ instructor }: { instructor: Instructor }) {
  const expLabel = `${instructor.experience} ${instructor.experience < 5 ? "года" : "лет"}`;
  const priceFrom = instructor.courses?.reduce<number | null>(
    (min, c) => (min === null || c.price < min ? c.price : min),
    null,
  );

  return (
    <Link
      to="/club/school/$instructorId"
      params={{ instructorId: instructor.slug }}
      className="group block overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 transition-colors active:scale-[0.99]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
        <img
          src={instructor.photo}
          alt={instructor.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Chip>{instructor.city}</Chip>
          <Chip>{expLabel} стажа</Chip>
        </div>
        <div className="absolute inset-x-3 bottom-3">
          <div className="font-display text-2xl font-black uppercase italic leading-none tracking-tight text-white">
            {instructor.name}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/70">
            {instructor.tagline}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {instructor.specialties.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-primary">
          {priceFrom !== null && priceFrom !== undefined && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              от {formatK(priceFrom)}
            </span>
          )}
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function formatK(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k ₽`;
  return `${n} ₽`;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white backdrop-blur-sm">
      {children}
    </span>
  );
}

function OnlineSoon() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Скоро</p>
      <h2 className="mt-3 font-display text-3xl font-black uppercase italic tracking-tight text-foreground md:text-4xl">
        Готовим программу
      </h2>
      <p className="mt-3 max-w-sm font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Онлайн-курсы школы появятся здесь
      </p>
    </div>
  );
}
