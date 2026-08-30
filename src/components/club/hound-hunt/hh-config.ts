// Конфиг охоты HELL HUNT. Источник истины — бекенд (`/api/v1/hunt/current`),
// localStorage используется как кеш для мгновенного первого рендера.
// Пишется из админки (/admin/hound-hunt), читается лендингом и шоу.

import { useCallback, useEffect, useState } from "react";
import { HUNT_PRIZES, HUNT_TICKET_STEP } from "./hh-mock";
import { fetchHuntState, type HuntApiState } from "@/lib/hunt-api";

export type HuntConfigPrize = {
  id: string;
  /** Место: 1 — главный приз, вскрывается последним. */
  place: number;
  title: string;
  /** Подпись под названием (например «Главный приз»); пустая — не рисуем. */
  sub: string;
  /** Картинка приза: URL или импортированный ассет. */
  img: string;
  /**
   * Заранее выбранный победитель (id участника) или null — честный жребий
   * по весам билетов.
   */
  forcedWinnerId: string | null;
  /** Итог с бека: кто выиграл (после прокрутки жребия). */
  winnerUserId?: string | null;
  winnerNick?: string | null;
  /** Если приз — билеты, сколько начисляем победителю. */
  ticketsReward?: number;
};

export type HuntConfig = {
  /** id охоты на бекенде (null, пока охоты нет). */
  id?: string | null;
  /** ISO-дата и время старта шоу. */
  startsAt: string;
  /** Сколько билетов даёт одну капсулу в барабане. */
  ticketStep: number;
  /** Итоги зафиксированы на бекенде (ISO) или null — жребий ещё не крутили. */
  drawnAt?: string | null;
  /** Статус охоты с бекенда. */
  status?: "draft" | "open" | "finished" | "canceled";
  /** Сколько призов — столько раундов. Порядок вскрытия: 3 → 2 → 1. */
  prizes: HuntConfigPrize[];
};

const KEY = "hh.hunt.config.v3";

/**
 * Дефолт старта: 30 августа 2026, 20:00 по Москве (UTC+3).
 * Мок — потом придёт с бекенда. Дата задана в UTC, чтобы таймер был одинаковым
 * в любом часовом поясе.
 */
function defaultStartsAt(): string {
  return new Date("2026-08-30T17:00:00.000Z").toISOString();
}


export function defaultHuntConfig(): HuntConfig {
  return {
    startsAt: defaultStartsAt(),
    ticketStep: HUNT_TICKET_STEP,
    prizes: HUNT_PRIZES.map((p) => ({
      id: p.id,
      place: p.place,
      title: p.title,
      sub: p.sub,
      img: p.img,
      forcedWinnerId: null,
    })),
  };
}

export function readHuntConfig(): HuntConfig {
  if (typeof window === "undefined") return defaultHuntConfig();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultHuntConfig();
    const parsed = JSON.parse(raw) as Partial<HuntConfig>;
    const base = defaultHuntConfig();
    const prizes = Array.isArray(parsed.prizes) && parsed.prizes.length ? parsed.prizes : base.prizes;
    return {
      id: parsed.id ?? null,
      drawnAt: parsed.drawnAt ?? null,
      status: parsed.status,
      startsAt: typeof parsed.startsAt === "string" ? parsed.startsAt : base.startsAt,
      ticketStep: Number(parsed.ticketStep) > 0 ? Number(parsed.ticketStep) : base.ticketStep,
      prizes: prizes.map((p, i) => ({
        id: p.id || `p${i + 1}`,
        place: Number(p.place) || i + 1,
        title: p.title || "Приз",
        sub: p.sub ?? "",
        img: p.img || base.prizes[0].img,
        forcedWinnerId: p.forcedWinnerId ?? null,
        winnerUserId: p.winnerUserId ?? null,
        winnerNick: p.winnerNick ?? null,
        ticketsReward: p.ticketsReward ?? 0,
      })),
    };
  } catch {
    return defaultHuntConfig();
  }
}

export function writeHuntConfig(cfg: HuntConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cfg));
  window.dispatchEvent(new Event("hh-hunt-config"));
}

/** Призы в порядке вскрытия: сначала младшие места, главный — последним. */
export function prizesInRunOrder(cfg: HuntConfig): HuntConfigPrize[] {
  return [...cfg.prizes].sort((a, b) => b.place - a.place);
}

/** Ответ бека → форма конфига, которую ждут компоненты. */
export function huntConfigFromApi(state: HuntApiState): HuntConfig | null {
  if (!state.hunt) return null;
  const base = defaultHuntConfig();
  return {
    id: state.hunt.id,
    drawnAt: state.hunt.drawnAt ?? null,
    status: state.hunt.status,
    startsAt: state.hunt.startsAt,
    ticketStep: state.hunt.ticketStep,
    prizes: state.prizes.map((p, i) => ({
      id: p.id,
      place: p.place,
      title: p.title,
      sub: p.sub ?? "",
      img:
        p.img ||
        HUNT_PRIZES.find((d) => d.place === p.place)?.img ||
        base.prizes[Math.min(i, base.prizes.length - 1)].img,
      forcedWinnerId: p.forcedWinnerId ?? null,
      winnerUserId: p.winnerUserId ?? null,
      winnerNick: p.winnerNick ?? null,
      ticketsReward: p.ticketsReward ?? 0,
    })),
  };
}

/**
 * Конфиг охоты. Источник истины — бекенд (`/api/v1/hunt/current`), localStorage
 * остаётся кешем на случай оффлайна/первого рендера.
 */
export function useHuntConfig() {
  const [cfg, setCfg] = useState<HuntConfig>(() => readHuntConfig());

  useEffect(() => {
    let alive = true;
    const sync = () => setCfg(readHuntConfig());
    window.addEventListener("hh-hunt-config", sync);
    window.addEventListener("storage", sync);

    void fetchHuntState()
      .then((state) => {
        if (!alive) return;
        const next = huntConfigFromApi(state);
        if (next) {
          writeHuntConfig(next);
          setCfg(next);
        }
      })
      .catch(() => {
        /* оффлайн/не авторизован — остаётся кеш */
      });

    return () => {
      alive = false;
      window.removeEventListener("hh-hunt-config", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: HuntConfig) => {
    writeHuntConfig(next);
    setCfg(next);
  }, []);

  return { cfg, save };
}
