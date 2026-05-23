import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

type Props = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
};

/** Общий каркас для юр. страниц: header + центрированный длинный текст + footer. */
export function LegalShell({ eyebrow, title, updatedAt, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
          {eyebrow}
        </div>
        <h1 className="mb-4 text-balance font-display text-4xl uppercase tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mb-12 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Редакция от {updatedAt}
        </p>
        <article className="prose prose-invert max-w-none space-y-5 text-[15px] leading-relaxed text-foreground/90 [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-base [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-foreground [&_p]:text-foreground/85 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-foreground">
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}
