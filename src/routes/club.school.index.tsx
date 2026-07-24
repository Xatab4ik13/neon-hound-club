import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/club/PageHeader";
import { TONE_BG } from "@/data/instructors";
import { fetchInstructors, schoolQk, type InstructorApi } from "@/lib/api-school";

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
    <main className="mx-auto w-full max-w-5xl px-4 py-5 md:py-8">
      <PageHeader title="Школа" subtitle="учись у тех, кто катает" />

      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-2xl bg-card p-1">
          <TabBtn active={tab === "instructors"} onClick={() => setTab("instructors")}>
            Инструкторы
          </TabBtn>
          <TabBtn active={tab === "online"} onClick={() => setTab("online")}>
            Онлайн-курсы
          </TabBtn>
        </div>
      </div>

      {tab === "instructors" ? <InstructorsGrid /> : <OnlineSoon />}
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
      className={`rounded-xl px-4 py-2 font-display text-xs font-black uppercase tracking-widest transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function InstructorsGrid() {
  const q = useQuery({ queryKey: schoolQk.instructors, queryFn: fetchInstructors });
  const items = q.data?.items ?? [];

  if (q.isLoading) {
    return (
      <div className="py-16 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Загружаем инструкторов…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
          Скоро появятся инструкторы
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Ищем и подключаем тех, кто реально катает
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-10 pt-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => (
        <InstructorCard key={it.id} instructor={it} index={i} />
      ))}
    </div>
  );
}

function InstructorCard({
  instructor,
  index,
}: {
  instructor: InstructorApi;
  index: number;
}) {
  const skew = index % 2 === 0 ? "-rotate-1" : "rotate-1";
  const exp = instructor.experience;
  const expLabel = exp > 0 ? `${exp} ${exp < 5 ? "года" : "лет"} стажа` : null;
  return (
    <Link
      to="/club/school/$instructorId"
      params={{ instructorId: instructor.slug }}
      className={`group relative block ${skew}`}
    >
      <div
        className={`relative overflow-hidden rounded-3xl border-[3px] border-foreground ${TONE_BG[instructor.tone]} shadow-[8px_8px_0_0_hsl(var(--foreground))] transition-transform duration-200 ease-out group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[10px_10px_0_0_hsl(var(--foreground))]`}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          {instructor.avatarUrl && (
            <img
              src={instructor.avatarUrl}
              alt={instructor.displayName}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
        </div>

        <div className="border-t-[3px] border-foreground bg-card px-4 py-3">
          <div className="font-display text-2xl font-black uppercase leading-none tracking-tight text-foreground">
            {instructor.displayName}
          </div>
        </div>
      </div>

      {instructor.city && (
        <div className="pointer-events-none absolute -top-3 left-3 -rotate-[4deg]">
          <PlumpTag>{instructor.city}</PlumpTag>
        </div>
      )}
      {expLabel && (
        <div className="pointer-events-none absolute -bottom-3 right-6 -rotate-[3deg]">
          <PlumpTag variant="accent">{expLabel}</PlumpTag>
        </div>
      )}
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
