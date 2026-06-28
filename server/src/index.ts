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
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

