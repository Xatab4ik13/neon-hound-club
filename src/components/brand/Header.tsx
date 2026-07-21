import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import hhrLogo from "@/assets/hhr-logo.png.asset.json";
import { PlumpCart } from "@/components/ui/icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useViewer } from "@/hooks/use-viewer";
import { useCart } from "@/hooks/use-cart";
import { useMyProfile } from "@/lib/garage-api";


const NAV = [
  { label: "Магазин", href: "/shop" },
  { label: "Hell Pass", href: "/hell-pass" },
  { label: "Школа", href: "/school" },
  { label: "Доставка и оплата", href: "/shop-info" },
  { label: "О клубе", href: "/about" },
];

export function Header() {
  const { isAuthed, nick, signOut, hydrated } = useViewer();
  const cartCount = useCart().count;
  const myProfile = useMyProfile(isAuthed);
  const avatarUrl = myProfile.data?.avatarUrl ?? null;
  const displayNick = myProfile.data?.nick ?? nick ?? "";

  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="relative flex h-20 w-full items-center justify-between pl-4 pr-4 md:pl-6 md:pr-8">
          {/* Desktop nav — left edge */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`group relative px-4 py-2.5 text-[13px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
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
                </Link>
              );
            })}
          </div>

          {/* Centered logo (absolute, so nav on left stays truly left) */}
          <Link
            to="/"
            aria-label="HELLHOUND Racing Club"
            className="pointer-events-auto absolute left-1/2 top-1/2 flex h-full -translate-x-1/2 -translate-y-1/2 items-center"
          >
            <img
              src={hhrLogo.url}
              alt="HELLHOUND Racing"
              className="pointer-events-none h-[144%] w-auto"
            />
          </Link>

          {/* Desktop cart + login */}
          <div className="hidden items-center gap-4 md:flex">
            <Link
              to="/cart"
              aria-label="Корзина"
              className="relative grid h-10 w-10 place-items-center text-foreground transition-transform active:scale-90"
            >
              <PlumpCart className="h-[22px] w-[22px]" strokeWidth={1.9} />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {!hydrated ? (
              <div aria-hidden className="h-10 w-10" />
            ) : isAuthed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Профиль"
                    className="relative grid h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/15 text-primary ring-2 ring-primary/40 transition-transform hover:ring-primary active:scale-95"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center font-mono text-[11px] font-bold uppercase text-primary">
                        {displayNick ? displayNick.slice(0, 2) : "—"}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 border-border bg-background"
                >
                  <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Личный кабинет
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/club">Главная клуба</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/club/me">Мой гараж</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/club/hell-pass">Hell Pass</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()}>Выйти</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="group relative overflow-hidden rounded-full border border-primary/30 px-6 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
              >
                <span className="relative z-10 transition-colors duration-300 group-hover:text-primary-foreground">
                  Войти
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 translate-y-full bg-primary transition-transform duration-300 group-hover:translate-y-0"
                />
              </Link>
            )}

          </div>

          {/* Mobile burger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            className="group relative flex h-11 w-11 items-center justify-center border border-primary/40 transition-colors hover:border-primary md:hidden"
          >
            <span className="sr-only">Меню</span>
            <span aria-hidden className="flex flex-col items-center justify-center gap-[5px]">
              <span className="block h-[2px] w-5 bg-primary transition-transform" />
              <span className="block h-[2px] w-5 bg-primary transition-transform" />
              <span className="block h-[2px] w-3 self-end bg-primary transition-transform" />
            </span>
          </button>

          {/* Mobile spacer to balance burger so absolute-centered logo stays visually centered */}
          <div aria-hidden className="h-11 w-11 md:hidden" />
        </div>
      </nav>


      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        cartCount={cartCount}
        isAuthed={isAuthed}
        pathname={pathname}
      />
    </>
  );
}

function MobileMenu({
  open,
  onClose,
  cartCount,
  isAuthed,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  cartCount: number;
  isAuthed: boolean;
  pathname: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      className={`fixed inset-0 z-[60] md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        className={`absolute inset-0 flex flex-col overflow-hidden bg-black transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Background rally stripes */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 20px)",
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-8 pt-12 pb-8">
          <Link
            to="/"
            onClick={onClose}
            aria-label="HELLHOUND Racing"
          >
            <img src={hhrLogo.url} alt="HELLHOUND Racing" className="h-12 w-auto" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="group relative flex h-12 w-12 items-center justify-center transition-transform active:scale-90"
          >
            <span
              aria-hidden
              className="absolute inset-0 border border-primary/30 transition-colors duration-500 group-hover:border-primary"
            />
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
              className="relative z-10 text-primary"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu list */}
        <nav className="relative z-10 flex flex-grow flex-col border-t border-white/[0.04]">
          {NAV.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className="group relative flex h-24 items-center overflow-hidden border-b border-white/[0.04] outline-none"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-active:translate-x-0"
                />
                <span
                  className="relative z-10 flex w-full items-center px-8 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-4 group-active:translate-x-4"
                >
                  <span
                    className={`font-display text-[42px] italic uppercase font-bold leading-none tracking-tight transition-colors duration-500 group-hover:text-black group-active:text-black ${
                      isActive ? "text-primary" : "text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: cart + login */}
        <div className="relative z-10 space-y-8 bg-gradient-to-t from-black via-black to-transparent p-8">
          <Link
            to="/cart"
            onClick={onClose}
            className="group flex w-fit items-center gap-4"
          >
            <span className="relative">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
                className="text-primary transition-transform duration-500 group-hover:scale-110"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {cartCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"
                  style={{ boxShadow: "0 0 8px var(--primary)" }}
                />
              )}
            </span>
            <span className="font-display text-xl italic uppercase tracking-widest text-white transition-colors duration-500 group-hover:text-primary">
              Корзина{" "}
              <span className="ml-1 align-top font-mono text-sm opacity-70">
                [{cartCount}]
              </span>
            </span>
          </Link>

          <Link
            to={isAuthed ? "/club/me" : "/login"}
            onClick={onClose}
            className="group relative block w-full overflow-hidden bg-primary py-7 text-center font-display text-2xl italic uppercase font-bold tracking-widest text-black transition-all duration-300 active:scale-[0.97]"
            style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)" }}
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10"
            />
            <span className="relative z-10">
              {isAuthed ? "Мой Гараж" : "Войти"}
            </span>
          </Link>
        </div>

        {/* Decorative right edge accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 flex-col gap-2 pr-1 opacity-30"
        >
          <span className="h-12 w-[2px] bg-primary" />
          <span className="h-4 w-[2px] bg-primary" />
          <span className="h-20 w-[2px] bg-primary" />
        </div>
      </div>
    </div>
  );
}
