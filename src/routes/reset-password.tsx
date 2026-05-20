import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Новый пароль — HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // После клика по письму Supabase кладёт recovery-сессию в URL-хеш и сам обрабатывает.
    // Достаточно дождаться появления сессии.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Пароль минимум 6 символов");
    if (password !== password2) return setError("Пароли не совпадают");
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => navigate({ to: "/club" }), 1200);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black pt-20">
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col px-6 py-10 md:py-16">
        <h1 className="font-display text-5xl italic uppercase font-bold leading-none tracking-tight text-white md:text-6xl">
          Новый пароль
        </h1>
        <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.2em] text-muted-foreground">
          {ready ? "Придумайте новый пароль" : "Проверяем ссылку…"}
        </p>

        {done ? (
          <p className="mt-8 border border-primary/30 bg-primary/[0.06] px-4 py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-primary">
            Пароль обновлён. Открываем клуб…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="новый пароль"
              disabled={!ready || loading}
              className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none placeholder:text-white/20 focus:border-primary disabled:opacity-50"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="повторите пароль"
              disabled={!ready || loading}
              className="h-14 w-full border border-white/15 bg-white/[0.02] px-4 font-mono text-base tracking-wider text-white outline-none placeholder:text-white/20 focus:border-primary disabled:opacity-50"
            />
            {error && (
              <p className="border border-red-500/30 bg-red-500/[0.06] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!ready || loading}
              className="relative h-14 w-full overflow-hidden border border-primary bg-primary font-display text-sm italic uppercase font-bold tracking-widest text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? "Сохраняем…" : "Сохранить пароль"}
            </button>
          </form>
        )}

        <div className="mt-auto pt-12">
          <Link
            to="/login"
            className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary"
          >
            ← К входу
          </Link>
        </div>
      </div>
    </main>
  );
}
