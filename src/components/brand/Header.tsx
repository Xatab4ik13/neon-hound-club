import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Logo } from "./Logo";

const NAV = [
  { label: "Магазин", href: "/shop" },
  { label: "Hell Pass", href: "/hell-pass" },
  { label: "О клубе", href: "/about" },
  { label: "Новости", href: "/news" },
];

type PillRect = { left: number; width: number } | null;

export function Header() {
  // TODO: replace with real auth state
  const isAuthed = false;

  const { pathname } = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pill, setPill] = useState<PillRect>(null);
  const [activePill, setActivePill] = useState<PillRect>(null);

  const activeIdx = NAV.findIndex(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
  );

  const measure = (idx: number | null): PillRect => {
    if (idx === null || idx < 0) return null;
    const el = itemRefs.current[idx];
    const wrap = navRef.current;
    if (!el || !wrap) return null;
    const a = el.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    return { left: a.left - b.left, width: a.width };
  };

  useLayoutEffect(() => {
    setActivePill(measure(activeIdx));
    setPill(measure(hoverIdx ?? activeIdx));
  }, [activeIdx, hoverIdx]);

  useEffect(() => {
    const onResize = () => {
      setActivePill(measure(activeIdx));
      setPill(measure(hoverIdx ?? activeIdx));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIdx, hoverIdx]);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-8">
        <Link
          to="/"
          aria-label="HELLHOUND Racing Club home"
          className="flex-shrink-0"
        >
          <Logo />
        </Link>

        <div
          ref={navRef}
          className="relative hidden items-center gap-1 md:flex"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Hover pill — следует за курсором */}
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 h-10 -translate-y-1/2 rounded-full bg-white/5 transition-all duration-300 ease-out ${
              pill && hoverIdx !== null ? "opacity-100" : "opacity-0"
            }`}
            style={
              pill
                ? { left: pill.left, width: pill.width }
                : { left: 0, width: 0 }
            }
          />
          {/* Active pill — подсветка текущего раздела */}
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 h-10 -translate-y-1/2 rounded-full bg-primary/10 transition-all duration-300 ease-out ${
              activePill ? "opacity-100" : "opacity-0"
            }`}
            style={
              activePill
                ? { left: activePill.left, width: activePill.width }
                : { left: 0, width: 0 }
            }
          />

          {NAV.map((item, idx) => {
            const isActive = idx === activeIdx;
            return (
              <a
                key={item.label}
                href={item.href}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onMouseEnter={() => setHoverIdx(idx)}
                onFocus={() => setHoverIdx(idx)}
                onBlur={() => setHoverIdx(null)}
                className={`relative z-10 px-5 py-2.5 text-[13px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-5">
          <a
            href="/cart"
            aria-label="Корзина"
            className="group relative text-muted-foreground transition-colors hover:text-primary"
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
