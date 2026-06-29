import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useViewer } from "@/hooks/use-viewer";
import { ApiError } from "@/lib/api";
import { isClubHost } from "@/lib/host";
import {
  PlumpEye,
  PlumpEyeOff,
  PlumpArrowRight,
  PlumpArrowLeft,
} from "@/components/ui/icons";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход в HELLHOUND Racing Club" },
      {
        name: "description",
        content: "Вход в HELLHOUND Racing Club по email или номеру телефона.",
      },
      { property: "og:title", content: "Вход в HELLHOUND Racing Club" },
      {
        property: "og:description",
        content: "Вход по email или подтверждённому номеру телефона.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "register";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function looksLikePhone(v: string) {
  const t = v.trim();
  return !t.includes("@") && /^[+\d][\d\s()-]{4,}$/.test(t);
}

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, resendVerification } = useViewer();
  const onClub = isClubHost();
  const [mode, setMode] = useState<Mode>("login");

  // login state
  const [loginId, setLoginId] = useState("");
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
  const [mailFailed, setMailFailed] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const id = loginId.trim();
    if (!id) return setError("Введите email или телефон");
    if (!isEmail(id) && !looksLikePhone(id))
      return setError("Введите корректный email или номер телефона");
    if (password.length < 8) return setError("Пароль минимум 8 символов");
    setBusy(true);
    try {
      const user = await signIn(id, password);
      navigate({ to: user.role === "blogger" ? "/blogger" : "/club" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && isEmail(id)) {
        setPendingEmail(id.toLowerCase());
        setMailFailed(false);
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
      setMailFailed(!res.mailDelivered);
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
      const res = await resendVerification(pendingEmail);
      if (res.mailDelivered) {
        setMailFailed(false);
        setResendMsg("Письмо отправлено — проверь почту");
      } else {
        setMailFailed(true);
        setResendMsg("Письмо не доставлено. Попробуй позже или напиши в поддержку.");
      }
    } catch (err) {
      setResendMsg(toMessage(err, "Не получилось отправить"));
    } finally {
      setBusy(false);
    }
  };

  // ───────── pending email screen ─────────
  if (pendingEmail) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black pt-20">
        <BgDecor />
        <div
          className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col px-6 py-10 md:py-16"
          style={{ animation: "page-fade-zoom 500ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          <Eyebrow>{onClub ? "Club · Confirm" : "Confirm · HHR.PRO"}</Eyebrow>
          <h1 className="mt-4 font-display text-[56px] italic uppercase font-black leading-[0.9] tracking-tight text-white md:text-7xl">
            Проверь
            <br />
            почту
          </h1>
          <p
            className={`mt-5 font-mono text-[12px] uppercase tracking-[0.2em] ${
              mailFailed ? "text-amber-400" : "text-muted-foreground"
            }`}
          >
            {mailFailed ? "Письмо не доставлено" : "Письмо ушло"}
          </p>
          {mailFailed ? (
            <p className="mt-6 text-base leading-relaxed text-white/80">
              Не получилось отправить ссылку на{" "}
              <span className="font-mono text-primary">{pendingEmail}</span>. Аккаунт создан —
              нажми «Отправить ещё раз» через пару минут или напиши в поддержку, если не помогает.
            </p>
          ) : (
            <p className="mt-6 text-base leading-relaxed text-white/80">
              Мы отправили ссылку для подтверждения на{" "}
              <span className="font-mono text-primary">{pendingEmail}</span>. Открой письмо и нажми
              кнопку — после этого зайдёшь в клуб.
            </p>
          )}
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Не пришло? Проверь «Спам». Ссылка живёт 24 часа.
          </p>

          {resendMsg && (
            <p
              className={`mt-6 border px-3 py-2 font-mono text-[11px] uppercase tracking-wider ${
                mailFailed
                  ? "border-amber-400/40 bg-amber-400/[0.06] text-amber-300"
                  : "border-primary/30 bg-primary/[0.06] text-primary"
              }`}
            >
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
              className="inline-flex w-full items-center justify-center gap-2 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-white"
            >
              <PlumpArrowLeft className="h-3.5 w-3.5" />
              Назад
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ───────── main login/register screen ─────────
  return (
    <main className="relative min-h-screen overflow-hidden bg-black pt-16 md:pt-20">
      <BgDecor />

      <div
        className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[480px] flex-col px-6 py-8 md:min-h-[calc(100vh-5rem)] md:py-16"
        style={{ animation: "page-fade-zoom 500ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        <Eyebrow>{onClub ? "Club · Access" : "HHR.PRO · Access"}</Eyebrow>

        <h1
          className="mt-3 font-display text-[56px] italic uppercase font-black leading-[0.9] tracking-tight text-white md:text-7xl"
          style={{
            textShadow:
              "0 0 24px color-mix(in oklab, var(--primary) 28%, transparent)",
          }}
        >
          {mode === "login" ? (
            <>
              Войти
              <br />в клуб
            </>
          ) : (
            <>
              Стать
              <br />
              своим
            </>
          )}
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {mode === "login"
            ? "Email или телефон · пароль"
            : "Email · ник · пароль"}
        </p>

        <div className="mb-7 mt-8 grid grid-cols-2 border border-white/10">
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
                  className={`absolute inset-0 bg-primary transition-transform duration-300 ${
                    active ? "translate-y-0" : "translate-y-full"
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
                inputMode="email"
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="you@example.com или +7 999 ..."
                className={INPUT_CLASS}
              />
            </FieldLabel>

            <FieldLabel label="Пароль">
              <PasswordField
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                placeholder="••••••••"
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
                className={INPUT_CLASS}
              />
            </FieldLabel>

            <FieldLabel label="Ник">
              <input
                type="text"
                autoComplete="username"
                value={regNick}
                onChange={(e) => setRegNick(e.target.value)}
                placeholder="asphalt_dog"
                className={INPUT_CLASS}
              />
            </FieldLabel>

            <FieldLabel label="Пароль">
              <PasswordField
                value={regPassword}
                onChange={setRegPassword}
                autoComplete="new-password"
                placeholder="минимум 8 символов"
              />
            </FieldLabel>

            <FieldLabel label="Повторите пароль">
              <PasswordField
                value={regPassword2}
                onChange={setRegPassword2}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </FieldLabel>

            {error && <ErrorLine>{error}</ErrorLine>}

            <SubmitButton busy={busy}>Создать аккаунт</SubmitButton>

            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Телефон и адрес доставки заполняются в личном кабинете после регистрации.
            </p>
          </form>
        )}

        <div className="mt-auto flex items-center justify-between gap-4 pt-12">
          {onClub ? (
            <a
              href="https://hhr.pro"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary"
            >
              <PlumpArrowLeft className="h-3.5 w-3.5" />
              На сайт
            </a>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary"
            >
              <PlumpArrowLeft className="h-3.5 w-3.5" />
              На главную
            </Link>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/20">
            HELLHOUND · HHR.PRO
          </span>
        </div>
      </div>
    </main>
  );
}

// ───────── shared bits ─────────

const INPUT_CLASS =
  "h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]";

function BgDecor() {
  return (
    <>
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
    </>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-[2px] w-8 bg-primary" />
      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
        {children}
      </span>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT_CLASS} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Скрыть пароль" : "Показать пароль"}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground transition-colors hover:text-primary"
      >
        {show ? <PlumpEyeOff className="h-5 w-5" /> : <PlumpEye className="h-5 w-5" />}
      </button>
    </div>
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
      <span className="relative z-10 inline-flex items-center justify-center gap-3">
        {busy ? "..." : (
          <>
            {children}
            <PlumpArrowRight className="h-6 w-6" />
          </>
        )}
      </span>
    </button>
  );
}
