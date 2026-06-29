import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { hhToast as toast } from "@/lib/hh-toast";
import { usePhoneSendCode, usePhoneVerify } from "@/lib/garage-api";

type Props = {
  /** Текущий введённый номер в E.164. */
  phone: string;
  /** Разрешено ли нажимать «Подтвердить» (валидный номер и т.п.). */
  canSend: boolean;
  /** Сообщить наверх, что номер успешно подтверждён. */
  onVerified?: () => void;
};

const CODE_LEN = 6;

/**
 * Панель подтверждения телефона через Telegram Gateway:
 * 1) кнопка «Отправить код» → POST /profile/phone/send-code
 * 2) 6 квадратиков под код + автоподстановка `one-time-code`, paste, ←/→/Backspace
 * 3) auto-submit при заполнении → POST /profile/phone/verify
 * 4) ресенд по таймеру.
 */
export function PhoneVerifyPanel({ phone, canSend, onVerified }: Props) {
  const sendMut = usePhoneSendCode();
  const verifyMut = usePhoneVerify();

  const [stage, setStage] = useState<"idle" | "code">("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [phoneMasked, setPhoneMasked] = useState<string>("");
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LEN).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Если номер изменили — сбрасываем флоу.
  useEffect(() => {
    setStage("idle");
    setRequestId(null);
    setDigits(Array(CODE_LEN).fill(""));
    setSecondsLeft(0);
  }, [phone]);

  // Таймеры (TTL кода + ресенд).
  useEffect(() => {
    if (secondsLeft <= 0 && resendIn <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft, resendIn]);

  const code = useMemo(() => digits.join(""), [digits]);

  const handleSend = async () => {
    // Лишний клик / нет номера — игнор.
    if (sendMut.isPending) return;
    if (!phone) {
      toast.error("Сначала введи номер");
      return;
    }
    try {
      // Серверу отдаём номер как есть — он сам нормализует через libphonenumber-js.
      const r = await sendMut.mutateAsync(phone);
      setRequestId(r.requestId);
      setPhoneMasked(r.phoneMasked);
      setSecondsLeft(r.expiresInSec);
      setResendIn(60);
      setDigits(Array(CODE_LEN).fill(""));
      setStage("code");
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      const msg =
        err.status === 429
          ? "Слишком часто. Подожди немного."
          : err.status === 409
            ? "Этот номер уже привязан к другому аккаунту"
            : err.status === 400
              ? "Неверный формат номера"
              : err.message || "Не удалось отправить код";
      toast.error(msg);
    }
  };

  const tryVerify = async (full: string) => {
    if (!requestId || full.length !== CODE_LEN) return;
    try {
      await verifyMut.mutateAsync({ requestId, code: full });
      toast.success("Телефон подтверждён");
      setStage("idle");
      setDigits(Array(CODE_LEN).fill(""));
      onVerified?.();
    } catch (e) {
      const err = e as { status?: number; message?: string };
      toast.error(err.message || "Неверный код");
      setDigits(Array(CODE_LEN).fill(""));
      setTimeout(() => inputsRef.current[0]?.focus(), 30);
    }
  };

  const setDigit = (i: number, v: string) => {
    const onlyDigits = v.replace(/\D/g, "");
    if (onlyDigits.length > 1) {
      // Paste / автозаполнение из СМС-уведомления — разложим по ячейкам.
      const next = [...digits];
      for (let k = 0; k < CODE_LEN; k++) {
        next[k] = onlyDigits[k] ?? "";
      }
      setDigits(next);
      const filled = next.join("");
      if (filled.length === CODE_LEN) {
        inputsRef.current[CODE_LEN - 1]?.blur();
        void tryVerify(filled);
      } else {
        inputsRef.current[Math.min(onlyDigits.length, CODE_LEN - 1)]?.focus();
      }
      return;
    }
    const next = [...digits];
    next[i] = onlyDigits;
    setDigits(next);
    if (onlyDigits && i < CODE_LEN - 1) inputsRef.current[i + 1]?.focus();
    const filled = next.join("");
    if (filled.length === CODE_LEN) {
      inputsRef.current[i]?.blur();
      void tryVerify(filled);
    }
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      inputsRef.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < CODE_LEN - 1) {
      inputsRef.current[i + 1]?.focus();
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (stage === "idle") {
    return (
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend || sendMut.isPending}
        className={cn(
          "mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 text-[13px] font-semibold uppercase tracking-wider text-primary transition-colors",
          "hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {sendMut.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        Подтвердить номер
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[12px] text-white/60">
        Код отправлен в Telegram на{" "}
        <span className="font-mono text-white/80">{phoneMasked}</span>
        {secondsLeft > 0 && (
          <span className="text-white/40"> · действует {fmtTime(secondsLeft)}</span>
        )}
      </div>

      <div className="flex justify-between gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            inputMode="numeric"
            // iOS: автозаполнение из приходящего SMS-уведомления (для не-SMS работает как обычное цифровое поле).
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoCapitalize="off"
            maxLength={i === 0 ? CODE_LEN : 1}
            disabled={verifyMut.isPending}
            aria-label={`Цифра ${i + 1} из ${CODE_LEN}`}
            className={cn(
              "h-12 w-full min-w-0 rounded-xl border bg-white/5 text-center font-mono text-lg font-semibold text-white transition-colors",
              "focus:outline-none focus:ring-2",
              d
                ? "border-primary/50 ring-1 ring-primary/30"
                : "border-white/10 focus:border-primary/60 focus:ring-primary/30",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 text-[12px]">
        <button
          type="button"
          onClick={handleSend}
          disabled={resendIn > 0 || sendMut.isPending}
          className="text-primary disabled:cursor-not-allowed disabled:text-white/30"
        >
          {sendMut.isPending
            ? "Отправляем…"
            : resendIn > 0
              ? `Отправить заново через ${resendIn}с`
              : "Отправить заново"}
        </button>
        {verifyMut.isPending && (
          <span className="inline-flex items-center gap-1.5 text-white/50">
            <Loader2 className="h-3 w-3 animate-spin" /> Проверяем код…
          </span>
        )}
      </div>
    </div>
  );
}
