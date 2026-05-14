import { Link, useLocation } from "@tanstack/react-router";

const NAV = [
  { label: "Магазин", href: "/shop" },
  { label: "Hell Pass", href: "/hell-pass" },
  { label: "О клубе", href: "/about" },
  { label: "Новости", href: "/news" },
];

export function Header() {
  // TODO: replace with real auth state
  const isAuthed = false;
  const { pathname } = useLocation();

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-8">
        <Link
          to="/"
          aria-label="HELLHOUND Racing Club"
          className="flex-shrink-0 font-display text-2xl font-bold tracking-tighter text-primary"
        >
          HELLHOUND
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a
                key={item.label}
                href={item.href}
                className={`group relative px-5 py-2.5 text-[13px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative z-10">{item.label}</span>
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full transition-all duration-300 ${
                    isActive
                      ? "scale-100 bg-primary/10 opacity-100"
                      : "scale-95 bg-white/5 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                  }`}
                />
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-5">
          <a
            href="/cart"
            aria-label="Корзина"
            className="relative text-muted-foreground transition-colors hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="absolute -right-2 -top-1 rounded-sm bg-primary px-1 font-mono text-[10px] leading-tight text-primary-foreground">
              0
            </span>
          </a>

          <a
            href={isAuthed ? "/garage" : "/login"}
            className="group relative overflow-hidden rounded-full border border-primary/30 px-6 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
          >
            <span className="relative z-10 transition-colors duration-300 group-hover:text-primary-foreground">
              {isAuthed ? "Мой Гараж" : "Войти"}
            </span>
            <span
              aria-hidden
              className="absolute inset-0 translate-y-full bg-primary transition-transform duration-300 group-hover:translate-y-0"
            />
          </a>
        </div>
      </div>
    </nav>
  );
}
