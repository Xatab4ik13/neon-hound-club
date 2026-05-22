export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="font-display text-3xl font-black italic uppercase tracking-tight text-foreground md:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground md:text-sm">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
