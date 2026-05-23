import { cn } from "@/lib/utils";

// Skeleton с shimmer-эффектом (iOS-style), а не плоский pulse.
// Используется во всех loading-состояниях.
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  );
}
