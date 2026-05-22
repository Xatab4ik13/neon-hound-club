import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api";
import { useViewer } from "@/hooks/use-viewer";

const search = z.object({ token: z.string().min(10).max(128).optional() });

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Подтверждение email — HELLHOUND Racing" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: VerifyEmailPage,
});

type State = "loading" | "ok" | "missing" | "invalid";

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const { refetchMe } = useViewer();
  const navigate = useNavigate();
  const [state, setState] = useState<State>(token ? "loading" : "missing");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await apiFetch<{ ok: true }>(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: "GET",
        });
        if (cancelled) return;
        await refetchMe();
        setState("ok");
        setTimeout(() => {
          if (!cancelled) navigate({ to: "/club" });
        }, 1500);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : "Ссылка недействительна";
        setErrMsg(msg);
        setState("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refetchMe, navigate]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "var(--primary)" }}
      />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col px-6 py-10 md:py-16">
        <h1 className="font-display text-5xl italic uppercase font-bold leading-none tracking-tight text-white md:text-6xl">
          {state === "ok" ? "Готово" : state === "loading" ? "Проверяем…" : "Не вышло"}
        </h1>
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.2em] text-muted-foreground">
          Подтверждение email
        </p>

        <div className="mt-8 text-base leading-relaxed text-white/80">
          {state === "loading" && <p>Подтверждаем твою почту…</p>}
          {state === "ok" && (
            <p>
              Email подтверждён. Заходим в{" "}
              <Link to="/club" className="text-primary underline-offset-4 hover:underline">
                клуб
              </Link>
              …
            </p>
          )}
          {state === "missing" && (
            <p>
              В ссылке нет токена. Открой письмо ещё раз или{" "}
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                запроси новое
              </Link>
              .
            </p>
          )}
          {state === "invalid" && (
            <>
              <p>{errMsg || "Ссылка недействительна или истекла."}</p>
              <p className="mt-4">
                <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                  Запросить письмо заново
                </Link>
              </p>
            </>
          )}
        </div>

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
