import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход в HELLHOUND Racing Club" },
      {
        name: "description",
        content:
          "Вход и регистрация в HELLHOUND Racing Club по номеру телефона. Доступ к Race Pass, мерчу и розыгрышам.",
      },
      { property: "og:title", content: "Вход в HELLHOUND Racing Club" },
      {
        property: "og:description",
        content:
          "Вход в клуб по номеру телефона. Подтверждение через SMS — без паролей.",
      },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "register";
type Step = "phone" | "code";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+7 ");
  const [code, setCode] = useState(["", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Resend countdown
  useEffect(() => {
    if (step !== "code" || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 11) return;
    setStep("code");
    setResendIn(45);
    setCode(["", "", "", ""]);
    setTimeout(() => codeRefs.current[0]?.focus(), 50);
  };

  const handleCodeChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 3) codeRefs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 4) {
      // TODO: verify code via backend
      setTimeout(() => navigate({ to: "/" }), 300);
    }
  };

  const handleCodeKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black pt-20">
      {/* Background rally stripes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 22px)",
        }}
      />
      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "var(--primary)" }}
      />

      {/* Decorative right edge accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 flex-col gap-2 pr-1 opacity-30 md:flex"
      >
        <span className="h-12 w-[2px] bg-primary" />
        <span className="h-4 w-[2px] bg-primary" />
        <span className="h-20 w-[2px] bg-primary" />
      </div>

      <div
        className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col px-6 py-10 md:py-16"
        style={{ animation: "page-fade-zoom 500ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        {/* Heading */}
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
            {step === "phone"
              ? mode === "login"
                ? "Введите номер — пришлём код в SMS"
                : "Регистрация по номеру телефона"
              : `Код отправлен на ${phone}`}
          </p>
        </div>

        {/* Tabs */}
        {step === "phone" && (
          <div className="mb-8 grid grid-cols-2 border border-white/10">
            {(["login", "register"] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`relative h-12 font-display text-sm italic uppercase font-bold tracking-widest transition-colors ${
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
        )}

        {/* Form */}
        {step === "phone" ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Номер телефона
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 999 123 45 67"
                className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-lg tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]"
              />
            </label>

            <button
              type="submit"
              className="group relative block w-full overflow-hidden bg-primary py-6 text-center font-display text-2xl italic uppercase font-bold tracking-widest text-black transition-all duration-300 active:scale-[0.97]"
              style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)" }}
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10"
              />
              <span className="relative z-10">
                {mode === "login" ? "Получить код" : "Создать аккаунт"}
              </span>
            </button>

            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Нажимая кнопку, вы соглашаетесь с{" "}
              <a href="/terms" className="text-primary underline-offset-4 hover:underline">
                правилами клуба
              </a>{" "}
              и обработкой персональных данных.
            </p>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between gap-3">
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    codeRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKey(i, e)}
                  className="h-20 w-full border border-white/15 bg-white/[0.02] text-center font-display text-4xl italic font-bold text-white outline-none transition-all focus:border-primary focus:bg-white/[0.04] focus:shadow-[0_0_20px_-4px_var(--primary)]"
                />
              ))}
            </div>

            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em]">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode(["", "", "", ""]);
                }}
                className="text-muted-foreground transition-colors hover:text-white"
              >
                ← Изменить номер
              </button>
              {resendIn > 0 ? (
                <span className="text-muted-foreground">Новый код через {resendIn}с</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setResendIn(45)}
                  className="text-primary transition-opacity hover:opacity-80"
                >
                  Выслать снова
                </button>
              )}
            </div>
          </div>
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
