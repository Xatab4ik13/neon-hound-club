import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useViewer } from "@/hooks/use-viewer";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход в HELLHOUND Racing Club" },
      {
        name: "description",
        content: "Вход и регистрация в HELLHOUND Racing Club по email и паролю.",
      },
      { property: "og:title", content: "Вход в HELLHOUND Racing Club" },
      {
        property: "og:description",
        content: "Вход по email и паролю. Регистрация по email, нику и паролю.",
      },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "register";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, resendVerification } = useViewer();
  const [mode, setMode] = useState<Mode>("login");

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");

  // register state
  const [regEmail, setRegEmail] = useState("");
  const [regNick, setRegNick] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // экран «проверьте почту» — общий для register-flow и login-of-unverified
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isEmail(loginEmail)) return setError("Введите корректный email");
    if (password.length < 8) return setError("Пароль минимум 8 символов");
    setBusy(true);
    try {
      await signIn(loginEmail, password);
      navigate({ to: "/club" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // email_not_verified
        setPendingEmail(loginEmail.trim().toLowerCase());
      } else {
        setError(toMessage(err, "Не удалось войти"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isEmail(regEmail)) return setError("Введите корректный email");
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(regNick))
      return setError("Ник: 3–32 символа, латиница, цифры и _");
    if (regPassword.length < 8) return setError("Пароль минимум 8 символов");
    if (regPassword !== regPassword2) return setError("Пароли не совпадают");
    setBusy(true);
    try {
      const res = await signUp(regEmail, regPassword, regNick);
      setPendingEmail(res.email);
    } catch (err) {
      setError(toMessage(err, "Не удалось создать аккаунт"));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResendMsg("");
    setBusy(true);
    try {
      await resendVerification(pendingEmail);
      setResendMsg("Письмо отправлено — проверь почту");
    } catch (err) {
      setResendMsg(toMessage(err, "Не получилось отправить"));
    } finally {
      setBusy(false);
    }
  };

  if (pendingEmail) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
          style={{ background: "var(--primary)" }}
        />
        <div
          className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col px-6 py-10 md:py-16"
          style={{ animation: "page-fade-zoom 500ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          <h1 className="font-display text-5xl italic uppercase font-bold leading-none tracking-tight text-white md:text-6xl">
            Проверь почту
          </h1>
          <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.2em] text-muted-foreground">
            Письмо ушло
          </p>
          <p className="mt-6 text-base leading-relaxed text-white/80">
            Мы отправили ссылку для подтверждения на{" "}
            <span className="font-mono text-primary">{pendingEmail}</span>. Открой письмо и нажми
            кнопку — после этого зайдёшь в клуб.
          </p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Не пришло? Проверь «Спам». Ссылка живёт 24 часа.
          </p>

          {resendMsg && (
            <p className="mt-6 border border-primary/30 bg-primary/[0.06] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-primary">
              {resendMsg}
            </p>
          )}

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={busy}
              className="block w-full border border-white/15 bg-white/[0.02] py-4 font-mono text-[12px] uppercase tracking-[0.22em] text-white transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
            >
              {busy ? "..." : "Отправить ещё раз"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingEmail(null);
                setResendMsg("");
                setError("");
              }}
              className="block w-full py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-white"
            >
              ← Назад
            </button>
          </div>
        </div>
      </main>
    );
  }


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
            {mode === "login" ? "Email и пароль" : "Регистрация: email, ник, пароль"}
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
            <FieldLabel label="Email">
              <input
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
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

            <SubmitButton busy={busy}>Войти</SubmitButton>
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

            <FieldLabel label="Ник">
              <input
                type="text"
                autoComplete="username"
                value={regNick}
                onChange={(e) => setRegNick(e.target.value)}
                placeholder="asphalt_dog"
                className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]"
              />
            </FieldLabel>

            <FieldLabel label="Пароль">
              <input
                type="password"
                autoComplete="new-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="минимум 8 символов"
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

            <SubmitButton busy={busy}>Создать аккаунт</SubmitButton>

            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Телефон и адрес доставки заполняются в личном кабинете после регистрации.
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

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
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

function SubmitButton({ children, busy }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group relative block w-full overflow-hidden bg-primary py-6 text-center font-display text-2xl italic uppercase font-bold tracking-widest text-black transition-all duration-300 active:scale-[0.97] disabled:opacity-60"
      style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)" }}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10"
      />
      <span className="relative z-10">{busy ? "..." : children}</span>
    </button>
  );
}
