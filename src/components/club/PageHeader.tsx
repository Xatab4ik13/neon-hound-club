// iOS-style large title. Сам по себе остаётся в потоке страницы —
// MobileTopBar следит за скроллом и плавно проявляет компактный заголовок
// в навбаре, когда этот большой уходит за край (как в Apple Mail / Settings).
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-5 md:mb-8">
      <h1 className="font-display text-[32px] font-black italic uppercase leading-[1.05] tracking-tight text-foreground md:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground md:text-sm">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

