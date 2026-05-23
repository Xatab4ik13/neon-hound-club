// Простая in-memory шина SSE-клиентов для ленты.
// Один процесс бэка → один Set подписчиков. Если когда-нибудь будет несколько
// инстансов, заменим на Postgres LISTEN/NOTIFY или Redis pub/sub.

import type { FastifyReply } from "fastify";

type Client = {
  id: number;
  reply: FastifyReply;
};

const clients = new Set<Client>();
let seq = 0;

export function addClient(reply: FastifyReply): Client {
  const c: Client = { id: ++seq, reply };
  clients.add(c);
  return c;
}

export function removeClient(c: Client): void {
  clients.delete(c);
  try {
    c.reply.raw.end();
  } catch {
    // already closed
  }
}

/** Шлём событие всем подписчикам. event — короткий тип, data — JSON-сериализуемое. */
export function publish(event: string, data: unknown = {}): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) {
    try {
      c.reply.raw.write(payload);
    } catch {
      removeClient(c);
    }
  }
}

/** Heartbeat-комментарий, чтобы прокси не рвали соединение. */
export function heartbeat(): void {
  for (const c of clients) {
    try {
      c.reply.raw.write(`: ping ${Date.now()}\n\n`);
    } catch {
      removeClient(c);
    }
  }
}

// Глобальный heartbeat раз в 25 секунд.
setInterval(heartbeat, 25_000).unref?.();
