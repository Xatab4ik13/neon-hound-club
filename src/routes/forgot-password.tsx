import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Восстановление пароля — HELLHOUND Racing Club" },
      {
        name: "description",
        content:
          "Сброс пароля для входа в HELLHOUND Racing Club. Введите email — пришлём ссылку для восстановления.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isEmail(email)) return setError("Введите корректный email");
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) return setError(err.message);
    setSent(true);
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
            Сброс
          </h1>
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.2em] text-muted-foreground">
            Восстановление пароля по email
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className="border border-primary/40 bg-primary/[0.06] p-5">
              <p className="font-mono text-[12px] uppercase tracking-wider text-foreground">
                Если аккаунт с email{" "}
                <span className="text-primary">{email}</span> существует, мы
                отправили на него ссылку для сброса пароля. Проверьте папку
                «Спам».
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary"
            >
              ← Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]"
              />
            </label>

            {error && (
              <p className="border border-red-500/30 bg-red-500/[0.06] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="group relative block w-full overflow-hidden bg-primary py-6 text-center font-display text-2xl italic uppercase font-bold tracking-widest text-black transition-all duration-300 active:scale-[0.97]"
              style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)" }}
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10"
              />
              <span className="relative z-10">Прислать ссылку</span>
            </button>

            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Сброс по SMS пока не подключён — восстановление только через email.
            </p>
          </form>
        )}

        <div className="mt-auto pt-12">
          <Link
            to="/login"
            className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary"
          >
            ← К форме входа
          </Link>
        </div>
      </div>
    </main>
  );
}
