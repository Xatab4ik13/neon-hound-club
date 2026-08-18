import { buildApp } from "./app.js";
import { expireUnpaidOrders } from "./lib/shop.js";
import { syncCdekStatuses } from "./lib/cdek-sync.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const app = await buildApp();

try {
  await app.listen({ port, host });
  app.log.info(`hellhound-api listening on ${host}:${port}`);

  // TTL-воркер для неоплаченных заказов: каждые 60с сносим просроченные
  // и возвращаем остатки. Один контейнер в проде — двойного запуска нет.
  setInterval(async () => {
    try {
      const removed = await expireUnpaidOrders();
      if (removed > 0) app.log.info({ removed }, "expired unpaid orders cleaned");
    } catch (e) {
      app.log.error({ err: e }, "expireUnpaidOrders failed");
    }
  }, 60_000).unref();

  // Авто-синхронизация статусов накладных СДЭК: раз в час по всем активным заказам.
  // Первый запуск через 30с после старта, чтобы не упереться в холодный СДЭК-OAuth.
  const runCdekSync = async () => {
    try {
      const r = await syncCdekStatuses();
      if (r.updated > 0 || r.errors > 0) {
        app.log.info({ ...r }, "cdek statuses synced");
      }
    } catch (e) {
      app.log.error({ err: e }, "syncCdekStatuses failed");
    }
  };
  setTimeout(runCdekSync, 30_000).unref();
  setInterval(runCdekSync, 60 * 60 * 1000).unref();

  // ─── AI-агент новостной ленты ─────────────────────────────────────
  // hot-поток раз в 15 мин, normal раз в 2 часа. Каждый прогон сам проверяет
  // enabled/paused и берёт single-flight lease, так что двойного запуска нет.
  const { runAgent, pruneCandidates } = await import("./lib/news-agent/run.js");
  const { flushQueue } = await import("./lib/news-agent/queue.js");

  const runNews = async (stream: "hot" | "normal") => {
    try {
      const r = await runAgent(stream);
      if (r.skipped) app.log.debug({ ...r }, "news agent skipped");
      else app.log.info({ ...r }, "news agent run");
    } catch (e) {
      app.log.error({ err: e, stream }, "news agent failed");
    }
  };

  setTimeout(() => void runNews("hot"), 90_000).unref();
  setInterval(() => void runNews("hot"), 15 * 60 * 1000).unref();
  setTimeout(() => void runNews("normal"), 5 * 60_000).unref();
  setInterval(() => void runNews("normal"), 2 * 60 * 60 * 1000).unref();

  // Очередь публикации: раз в минуту выпускаем то, чей слот наступил.
  setInterval(async () => {
    try {
      const n = await flushQueue();
      if (n > 0) app.log.info({ published: n }, "news queue flushed");
    } catch (e) {
      app.log.error({ err: e }, "flushQueue failed");
    }
  }, 60_000).unref();

  // ─── Напоминания пушами ───────────────────────────────────────────
  // Тик раз в минуту: HellSpin в 23:00 МСК, Hell Pass за 24 ч до конца,
  // капсула ×2 за 3 ч до конца.
  const { runReminderTick } = await import("./lib/push-reminders.js");
  setInterval(async () => {
    try {
      const r = await runReminderTick();
      if (r.spins || r.pass || r.boost) app.log.info({ ...r }, "push reminders sent");
    } catch (e) {
      app.log.error({ err: e }, "runReminderTick failed");
    }
  }, 60_000).unref();

  // Чистка старых кандидатов раз в сутки.
  setInterval(() => void pruneCandidates().catch(() => {}), 24 * 60 * 60 * 1000).unref();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

