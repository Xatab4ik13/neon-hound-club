import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

export const Route = createFileRoute("/tg-login")({
  head: () => ({
    meta: [
      { title: "Вход через Telegram — HELLHOUND" },
      { name: "description", content: "Первый вход для тех, кто покупал в боте @hhr_probot." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TgLoginPage,
});

type Step = "start" | "waiting" | "password" | "not_found" | "conflict" | "expired";

const INPUT =
  "h-14 w-full border border-border bg-background/40 px-4 font-mono text-base tracking-wider text-foreground outline-none focus:border-primary";
const BTN =
  "flex h-14 w-full items-center justify-center bg-primary font-mono text-sm uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50";

function TgLoginPage() {
  const [step, setStep] = useState<Step>("start");
  const [botUrl, setBotUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const codeRef = useRef("");
  const tokenRef = useRef("");

  const start = async () => {
    setError("");
    setBusy(true);
    try {
      const r = await apiFetch<{ code: string; botUrl: string }>("/api/v1/tg/login/start", { method: "POST", body: "{}" });
      codeRef.current = r.code;
      setBotUrl(r.botUrl);
      setStep("waiting");
      window.open(r.botUrl, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось начать вход");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (step !== "waiting") return;
    const t = setInterval(async () => {
      try {
        const r = await apiFetch<{ status: string; recoveryToken?: string }>("/api/v1/tg/login/poll", {
          method: "POST",
          body: JSON.stringify({ code: codeRef.current }),
        });
        if (r.status === "ok" && r.recoveryToken) {
          tokenRef.current = r.recoveryToken;
          setStep("password");
        } else if (r.status === "not_found" || r.status === "conflict") {
          setStep(r.status);
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 410) setStep("expired");
        else if (e instanceof ApiError && e.status === 403) { setError(e.message); setStep("start"); }
      }
    }, 2500);
    return () => clearInterval(t);
  }, [step]);

  const savePassword = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError("");
    if (pw.length < 8) return setError("Пароль минимум 8 символов");
    if (pw !== pw2) return setError("Пароли не совпадают");
    setBusy(true);
    try {
      await apiFetch("/api/v1/auth/recovery/reset-password", {
        method: "POST",
        body: JSON.stringify({ recoveryToken: tokenRef.current, newPassword: pw }),
      });
      window.location.href = "/club";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить пароль");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-foreground">
      <h1 className="font-display text-3xl uppercase">Покупал в боте</h1>

      {step === "start" && (
        <>
          <p className="text-muted-foreground">
            Аккаунт с твоими билетами уже создан. Подтверди номер в Telegram — и сразу войдёшь, а потом задашь пароль.
          </p>
          <button className={BTN} disabled={busy} onClick={start}>Войти через Telegram</button>
        </>
      )}

      {step === "waiting" && (
        <>
          <p className="text-muted-foreground">
            В боте @hhr_probot нажми «Подтвердить номер». Эта страница откроет вход сама.
          </p>
          <a className={BTN} href={botUrl} target="_blank" rel="noreferrer">Открыть бота</a>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Ждём подтверждения…</p>
        </>
      )}

      {step === "password" && (
        <form onSubmit={savePassword} className="space-y-4">
          <p className="text-muted-foreground">Ты вошёл. Задай пароль — дальше входи по номеру телефона и паролю.</p>
          <input className={INPUT} type="password" autoComplete="new-password" placeholder="Новый пароль" value={pw} onChange={(e) => setPw(e.target.value)} />
          <input className={INPUT} type="password" autoComplete="new-password" placeholder="Повтори пароль" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          <button className={BTN} disabled={busy} type="submit">Сохранить и войти</button>
        </form>
      )}

      {step === "not_found" && <p className="text-muted-foreground">На номер из Telegram нет покупок. Если покупал на другой номер — напиши в поддержку бота.</p>}
      {step === "conflict" && <p className="text-muted-foreground">На этот номер несколько аккаунтов — напиши в поддержку, поможем войти.</p>}
      {step === "expired" && (
        <>
          <p className="text-muted-foreground">Ссылка устарела.</p>
          <button className={BTN} onClick={() => setStep("start")}>Начать заново</button>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Link to="/login" className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">← Обычный вход</Link>
    </div>
  );
}
