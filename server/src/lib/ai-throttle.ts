// Глобальный семафор на одновременные запросы к OpenRouter + per-user lock.
// In-memory: достаточно для одной ноды Fastify. При горизонтальном масштабе
// нужно переезжать на Redis, но сейчас (одна VPS) — лишнее.

const GLOBAL_MAX = Number(process.env.AI_GLOBAL_CONCURRENCY ?? 40);
// Сколько максимум ждать слота в очереди (мс). Дольше — отказываем.
const QUEUE_TIMEOUT_MS = Number(process.env.AI_QUEUE_TIMEOUT_MS ?? 25_000);

let inFlight = 0;
const waiters: Array<() => void> = [];

function tryAcquireGlobal(): boolean {
  if (inFlight < GLOBAL_MAX) {
    inFlight++;
    return true;
  }
  return false;
}

function releaseGlobal(): void {
  inFlight = Math.max(0, inFlight - 1);
  const next = waiters.shift();
  if (next) {
    inFlight++;
    next();
  }
}

export class AiBusyError extends Error {
  status = 503;
  constructor(message = "Hell AI перегружен, попробуй ещё раз через минуту.") {
    super(message);
  }
}

export class AiUserBusyError extends Error {
  status = 409;
  constructor(message = "Подожди, предыдущий ответ ещё идёт.") {
    super(message);
  }
}

// Per-user lock: один активный AI-запрос на юзера. Защита от F5-спама и от
// того что один юзер выжирает все слоты семафора.
const userLocks = new Set<string>();

export function acquireUserLock(userId: string): void {
  if (userLocks.has(userId)) {
    throw new AiUserBusyError();
  }
  userLocks.add(userId);
}

export function releaseUserLock(userId: string): void {
  userLocks.delete(userId);
}

// Ждём глобальный слот. Если за QUEUE_TIMEOUT_MS не получили — бросаем AiBusyError.
export function acquireGlobalSlot(): Promise<void> {
  if (tryAcquireGlobal()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // вычищаем waiter
      const idx = waiters.indexOf(grant);
      if (idx >= 0) waiters.splice(idx, 1);
      reject(new AiBusyError());
    }, QUEUE_TIMEOUT_MS);

    const grant = () => {
      if (settled) {
        // нас уже отменили — но слот уже взяли в releaseGlobal, отдаём обратно
        releaseGlobal();
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    waiters.push(grant);
  });
}

export function releaseGlobalSlot(): void {
  releaseGlobal();
}

// Удобный обёртка: захватывает оба лока, гарантирует освобождение.
export async function withAiSlot<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  acquireUserLock(userId); // бросит AiUserBusyError если юзер уже в работе
  try {
    await acquireGlobalSlot(); // ждёт очередь, бросит AiBusyError по таймауту
    try {
      return await fn();
    } finally {
      releaseGlobalSlot();
    }
  } finally {
    releaseUserLock(userId);
  }
}

export function aiThrottleStats() {
  return {
    inFlight,
    waiting: waiters.length,
    globalMax: GLOBAL_MAX,
    usersBusy: userLocks.size,
  };
}
