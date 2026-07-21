import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import hhrLogo from "@/assets/hhr-logo.png.asset.json";
import { PlumpCart, PlumpMenu, PlumpDoorEnter, PlumpDoorExit } from "@/components/ui/icons";
import navShop from "@/assets/nav/nav-shop.jpg";
import navPass from "@/assets/nav/nav-pass.jpg";
import navSchool from "@/assets/nav/nav-school.jpg";
import navDelivery from "@/assets/nav/nav-delivery.jpg";
import navAbout from "@/assets/nav/nav-about.jpg";

const NAV_IMAGES: Record<string, string> = {
  "/": navAbout,
  "/shop": navShop,
  "/hell-pass": navPass,
  "/school": navSchool,
  "/shop-info": navDelivery,
  "/about": navAbout,
};



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
  { label: "Главная", href: "/" },
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
  const [scrolled, setScrolled] = useState(false);

  // Transparent-over-hero режим только на главной
  const overHero = pathname === "/";

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Track scroll to swap transparent → solid header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const transparent = overHero && !scrolled;

  return (
    <>
      <nav
        className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
          transparent
            ? "border-b border-transparent bg-transparent backdrop-blur-0"
            : "border-b border-white/5 bg-background/80 backdrop-blur-md"
        }`}
      >

        <div className="relative flex h-20 w-full items-center justify-between pl-4 pr-4 md:pl-6 md:pr-8">
          {/* Desktop burger — replaces text nav */}
          <button
            type="button"
            aria-label={menuOpen ? "Закрыть меню" : "Меню"}
            onClick={() => setMenuOpen((v) => !v)}
            className="relative z-[70] hidden h-14 w-16 items-center justify-center md:inline-flex"
          >
            <PlumpMenu
              className={`h-9 w-9 transition-transform duration-200 ease-out ${
                menuOpen
                  ? "rotate-90 scale-110 text-primary"
                  : "text-foreground"
              }`}
            />
          </button>


          {/* Centered logo — anchored to header top so it only overflows below */}
          <Link
            to="/"
            aria-label="HELLHOUND Racing Club"
            className="pointer-events-auto absolute left-1/2 top-0 flex h-full -translate-x-1/2 items-start"
          >
            <img
              src={hhrLogo.url}
              alt="HELLHOUND Racing"
              className="pointer-events-none h-[187%] w-auto"
            />
          </Link>

          {/* Desktop cart + login */}
          <div className="hidden items-center gap-4 md:flex">
            {!overHero && (
              <Link
                to="/cart"
                aria-label="Корзина"
                className="relative grid h-14 w-14 place-items-center text-foreground transition-transform active:scale-90"
              >
                <PlumpCart className="h-9 w-9" strokeWidth={1.9} />
                {cartCount > 0 && (
                  <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
            )}

            {!hydrated ? (
              <div aria-hidden className="h-16 w-16" />
            ) : isAuthed ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Профиль"
                      className="relative grid h-16 w-16 place-items-center text-foreground outline-none focus:outline-none"
                    >
                      <span className="relative grid h-12 w-12 place-items-center rounded-full border-2 border-foreground">
                        <span className="relative grid h-[88%] w-[88%] overflow-hidden rounded-full bg-primary/15">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <span className="grid h-full w-full place-items-center font-mono text-lg font-bold uppercase text-primary">
                              {displayNick ? displayNick.slice(0, 2) : "—"}
                            </span>
                          )}
                        </span>
                      </span>
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
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  aria-label="Выйти"
                  className="relative grid h-14 w-14 place-items-center text-foreground transition-transform active:scale-90"
                >
                  <PlumpDoorExit className="h-9 w-9" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                aria-label="Войти"
                className="relative grid h-14 w-14 place-items-center text-foreground transition-transform active:scale-90"
              >
                <PlumpDoorEnter className="h-9 w-9" />
              </Link>
            )}

          </div>


          {/* Mobile burger */}
          <button
            type="button"
            aria-label={menuOpen ? "Закрыть меню" : "Меню"}
            onClick={() => setMenuOpen((v) => !v)}
            className="relative z-[70] ml-auto flex h-14 w-16 items-center justify-center text-primary md:hidden"
          >
            <span className="sr-only">Меню</span>
            <PlumpMenu
              className={`h-9 w-9 transition-transform duration-200 ease-out ${
                menuOpen ? "rotate-90 scale-110" : "rotate-0 scale-100"
              }`}
            />
          </button>


        </div>
      </nav>

      <DesktopPlatesMenu open={menuOpen} onClose={() => setMenuOpen(false)} pathname={pathname} />

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

function DesktopPlatesMenu({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[55] hidden md:block ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Click-catcher (no dim, no blur — plates float over the site) */}
      <div onClick={onClose} className="absolute inset-0" />

      {/* Plates column — Plump Solid style: white outline + hard white offset drop */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex flex-col justify-start gap-5 px-8 pt-28 pb-8">
        {NAV.map((item, i) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div
              key={item.href}
              className="pointer-events-none"
              style={{
                transform: open ? "translateX(0)" : "translateX(-80px)",
                opacity: open ? 1 : 0,
                transition:
                  "transform 420ms cubic-bezier(0.16,1,0.3,1), opacity 420ms cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: open ? `${i * 60}ms` : "0ms",
                willChange: "transform, opacity",
              }}
            >
              <Link
                to={item.href}
                onClick={onClose}
                className={`group pointer-events-auto relative flex h-[84px] w-[360px] items-center justify-center rounded-2xl border-[3px] border-foreground bg-card px-4 transition-[background-color,color,transform] duration-150 ease-out hover:bg-primary active:scale-[0.98] ${
                  isActive ? "bg-primary" : ""
                }`}
                style={{
                  boxShadow: "6px 6px 0 0 hsl(var(--foreground))",
                }}
              >
                <span
                  className={`font-display text-[26px] italic font-black uppercase leading-none tracking-tight text-center transition-colors duration-150 ease-out ${
                    isActive
                      ? "text-primary-foreground"
                      : "text-foreground group-hover:text-primary-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
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
            <img src={hhrLogo.url} alt="HELLHOUND Racing" className="h-24 w-auto" />
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
