export function Logo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`font-display text-2xl uppercase tracking-tight leading-none ${className}`}
    >
      <span className="text-primary">HELL</span>
      <span className="text-foreground">HOUND</span>
    </div>
  );
}
