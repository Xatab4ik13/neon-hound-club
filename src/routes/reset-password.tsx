import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api";

const search = z.object({ token: z.string().min(10).max(2048).optional() });

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Новый пароль — HELLHOUND Racing Club" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Минимум 8 символов");
    if (password !== repeat) return setError("Пароли не совпадают");
    if (!token) return setError("Ссылка недействительна");
    setLoading(true);
    try {
      await apiFetch<{ ok: true }>("/api/v1/auth/recovery/reset-password", {
        method: "POST",
        body: JSON.stringify({ recoveryToken: token, newPassword: password }),
      });
      setDone(true);
      setTimeout(() => navigate({ to: "/login" }), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сменить пароль");
    } finally {
      setLoading(false);
    }
  };

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
        <div className="mb-8">
          <h1 className="font-display text-5xl uppercase font-bold leading-none tracking-tight text-white md:text-6xl">
            Новый пароль
          </h1>
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.2em] text-muted-foreground">
            Придумай пароль и войди заново
          </p>
        </div>

        {!token ? (
          <div className="space-y-5">
            <p className="border border-red-500/30 bg-red-500/[0.06] px-3 py-3 font-mono text-[11px] uppercase tracking-wider text-red-400">
              Ссылка недействительна или истекла. Запроси новую.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary"
            >
              → Запросить ссылку заново
            </Link>
          </div>
        ) : done ? (
          <div className="border border-primary/40 bg-primary/[0.06] p-5">
            <p className="font-mono text-[12px] uppercase tracking-wider text-foreground">
              Пароль обновлён. Перекидываем на вход…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Новый пароль
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none transition-colors placeholder:text-white/20 focus:border-primary focus:bg-white/[0.04]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Повтори пароль
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
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
              disabled={loading}
              className="group relative block w-full overflow-hidden bg-primary py-6 text-center font-display text-2xl uppercase font-bold tracking-widest text-black transition-all duration-300 active:scale-[0.97] disabled:opacity-60"
              style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)" }}
            >
              <span className="relative z-10">{loading ? "Сохраняем…" : "Сохранить"}</span>
            </button>
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
