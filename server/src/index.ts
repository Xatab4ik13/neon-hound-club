import { buildApp } from "./app.js";
import { expireUnpaidOrders } from "./lib/shop.js";

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
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
