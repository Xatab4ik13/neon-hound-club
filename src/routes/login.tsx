import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход в HELLHOUND Racing Club" },
      {
        name: "description",
        content:
          "Вход и регистрация в HELLHOUND Racing Club по email или телефону и паролю.",
      },
      { property: "og:title", content: "Вход в HELLHOUND Racing Club" },
      {
        property: "og:description",
        content:
          "Вход по email или телефону. Регистрация по email и паролю.",
      },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "register";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isPhoneLike(v: string) {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10;
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");

  // login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // register state
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const id = identifier.trim();
    if (!id) return setError("Введите email или телефон");
    if (!isEmail(id) && !isPhoneLike(id))
      return setError("Это не похоже на email или телефон");
    if (password.length < 6) return setError("Пароль минимум 6 символов");

    setLoading(true);
    // Phone-логин подключим позже (нужен SMS-провайдер). Пока — email + password.
    if (!isEmail(id)) {
      setLoading(false);
      return setError("Вход по телефону пока недоступен — используйте email");
    }
    const { error: err } = await supabase.auth.signInWithPassword({
      email: id,
      password,
    });
    setLoading(false);
    if (err) return setError(translateAuthError(err.message));
    navigate({ to: "/club" });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!isEmail(regEmail)) return setError("Введите корректный email");
    if (regPassword.length < 6) return setError("Пароль минимум 6 символов");
    if (regPassword !== regPassword2) return setError("Пароли не совпадают");

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: { emailRedirectTo: `${window.location.origin}/club` },
    });
    setLoading(false);
    if (err) return setError(translateAuthError(err.message));
    if (data.session) {
      navigate({ to: "/club" });
    } else {
      setInfo("Готово. Проверь почту и подтверди email — после этого войдёшь в клуб.");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 22px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "var(--primary)" }}
      />

      <div
        className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col px-6 py-10 md:py-16"
        style={{ animation: "page-fade-zoom 500ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        <div className="mb-8">
          <h1
            className="font-display text-5xl italic uppercase font-bold leading-none tracking-tight text-white md:text-6xl"
            style={{
              textShadow: "0 0 20px color-mix(in oklab, var(--primary) 25%, transparent)",
            }}
          >
            {mode === "login" ? "Войти" : "В клуб"}
          </h1>
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.2em] text-muted-foreground">
            {mode === "login"
              ? "Email или телефон + пароль"
              : "Регистрация по email и паролю"}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 border border-white/10">
          {(["login", "register"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`relative h-12 overflow-hidden font-display text-sm italic uppercase font-bold tracking-widest transition-colors ${
                  active ? "text-black" : "text-muted-foreground hover:text-white"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-0 transition-transform duration-300 ${
                    active ? "translate-y-0 bg-primary" : "translate-y-full bg-primary"
                  }`}
                />
                <span className="relative z-10">
                  {m === "login" ? "Вход" : "Регистрация"}
                </span>
              </button>
            );
          })}
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <FieldLabel label="Email или телефон">
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com или +7 999 123 45 67"
                className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]"
              />
            </FieldLabel>

            <FieldLabel label="Пароль">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]"
              />
            </FieldLabel>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
              >
                Забыли пароль?
              </Link>
            </div>

            {error && <ErrorLine>{error}</ErrorLine>}
            {info && <InfoLine>{info}</InfoLine>}

            <SubmitButton disabled={loading}>{loading ? "Входим…" : "Войти"}</SubmitButton>

            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Вход по телефону работает, если номер указан в профиле.
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5">
            <FieldLabel label="Email">
              <input
                type="email"
                autoComplete="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]"
              />
            </FieldLabel>

            <FieldLabel label="Пароль">
              <input
                type="password"
                autoComplete="new-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="минимум 6 символов"
                className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]"
              />
            </FieldLabel>

            <FieldLabel label="Повторите пароль">
              <input
                type="password"
                autoComplete="new-password"
                value={regPassword2}
                onChange={(e) => setRegPassword2(e.target.value)}
                placeholder="••••••••"
                className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]"
              />
            </FieldLabel>

            {error && <ErrorLine>{error}</ErrorLine>}
            {info && <InfoLine>{info}</InfoLine>}

            <SubmitButton disabled={loading}>{loading ? "Создаём…" : "Создать аккаунт"}</SubmitButton>

            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Телефон, ник и адрес доставки заполняются в личном кабинете после регистрации.
            </p>
          </form>
        )}

        <div className="mt-auto pt-12">
          <Link
            to="/"
            className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary"
          >
            ← На главную
          </Link>
        </div>
      </div>
    </main>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-red-500/30 bg-red-500/[0.06] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-red-400">
      {children}
    </p>
  );
}

function InfoLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-primary/30 bg-primary/[0.06] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
      {children}
    </p>
  );
}

function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="group relative block w-full overflow-hidden bg-primary py-6 text-center font-display text-2xl italic uppercase font-bold tracking-widest text-black transition-all duration-300 active:scale-[0.97] disabled:opacity-50"
      style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)" }}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10"
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Неверный email или пароль";
  if (m.includes("email not confirmed")) return "Сначала подтверди email — мы прислали письмо";
  if (m.includes("user already registered")) return "Этот email уже зарегистрирован";
  if (m.includes("rate limit")) return "Слишком много попыток. Подожди минуту";
  if (m.includes("password should be")) return "Пароль слишком короткий (минимум 6 символов)";
  return msg;
}
