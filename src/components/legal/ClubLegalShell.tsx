import type { ReactNode } from "react";
import { ChevronLeft } from "@/components/ui/icons";
import { Link } from "@tanstack/react-router";
import { LEGAL } from "@/data/legal";

type Props = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  /** Куда возвращает кнопка «назад» в шапке. По умолчанию — на список розыгрышей. */
  backTo?: string;
  backLabel?: string;
};

/**
 * Каркас для юридических страниц ВНУТРИ клуба (/club/legal/*).
 * Без своего Header/Footer — рендерится внутри ClubLayout, который уже даёт
 * мобильный TopBar + нижний TabBar (iOS-feel).
 */
export function ClubLegalShell({
  eyebrow,
  title,
  children,
  backTo = "/club/raffles",
  backLabel = "Назад",
}: Props) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-6 md:px-8 md:pt-10">
      <Link
        to={backTo}
        className="mb-5 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-primary">
        {eyebrow}
      </div>
      <h1 className="mb-3 text-balance font-display text-3xl uppercase tracking-tight md:text-4xl">
        {title}
      </h1>
      <p className="mb-8 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Редакция от {LEGAL.registeredAt}
      </p>

      <article className="prose prose-invert max-w-none space-y-5 text-[14px] leading-relaxed text-foreground/90 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-foreground [&_p]:text-foreground/85 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-foreground">
        {children}
      </article>
    </div>
  );
}
