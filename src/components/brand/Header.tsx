import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const NAV = [
  { label: "Магазин", href: "/shop" },
  { label: "Новости", href: "/news" },
  { label: "Hell Pass", href: "/hell-pass" },
  { label: "О клубе", href: "/about" },
];

export function Header() {
  // TODO: replace with real auth state
  const isAuthed = false;

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

        <div className="flex items-center gap-3">
          <a
            href="/cart"
            aria-label="Корзина"
            className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
          </a>

          <a
            href={isAuthed ? "/garage" : "/login"}
            className="rounded-sm border border-primary/30 bg-transparent px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/5"
          >
            {isAuthed ? "Мой Гараж" : "Войти"}
          </a>
        </div>
      </div>
    </nav>
  );
}
