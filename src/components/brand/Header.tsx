import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const NAV = [
  { label: "Race Pass", href: "#race-pass" },
  { label: "Мерч", href: "#drop" },
  { label: "Гараж", href: "#garage" },
  { label: "Клуб", href: "#club" },
];

export function Header() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" aria-label="HELLHOUND Racing Club home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-8 text-xs font-medium uppercase tracking-widest text-muted-foreground md:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </div>

        <button className="rounded-sm border border-primary/30 bg-transparent px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/5">
          Войти
        </button>
      </div>
    </nav>
  );
}
