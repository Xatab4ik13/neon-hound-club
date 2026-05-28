# hellhound-api

Бекенд HELLHOUND. Живёт в этом же репо, в папке `server/`. Деплоится отдельно от фронта (фронт — Timeweb Apps, бек — твой VPS под `api.hhr.pro`).

## Стек

Fastify 5 + Drizzle + Postgres 16 + Redis + MinIO. Auth — свой JWT в httpOnly cookie на `.hhr.pro`.

## Первый деплой на VPS

```bash
# на VPS
git clone <repo> hellhound && cd hellhound/server
test -f .env || cp .env.example .env
nano .env                  # если .env уже есть — НЕ перетирать, только править точечно
docker compose up -d --build
```

Миграции применяются автоматически при старте `api`, отдельно запускать `db:migrate` не нужно.

Nginx наружу:

```
server {
  server_name api.hhr.pro;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Потом `certbot --nginx -d api.hhr.pro`.

## Обновления

```bash
cd ~/hellhound && git pull
cd server && docker compose up -d --build
```

## Проверка

```bash
curl https://api.hhr.pro/healthz
# {"ok":true,"ts":...}

`/health` тоже отвечает тем же payload для внешних health-check систем.
```

## Структура

```
server/
├── src/
│   ├── app.ts             # сборка Fastify (cors, cookie, jwt, rate-limit)
│   ├── index.ts           # entrypoint
│   ├── db/
│   │   ├── client.ts      # Drizzle client
│   │   ├── migrate.ts     # runner миграций
│   │   ├── schema/        # Drizzle-схема (Этап 3)
│   │   └── migrations/    # SQL-миграции (генерятся drizzle-kit)
│   ├── auth/              # JWT, middleware (Этап 2)
│   ├── modules/           # фичи: shop/orders/quests/... (Этап 4)
│   └── storage/           # MinIO/S3 (Этап 4)
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
└── .env.example
```

## Этапы

- ✅ Этап 1 — скелет (этот коммит)
- ⏳ Этап 2 — auth (users, JWT, /auth/*)
- ⏳ Этап 3 — полная схема БД (одна большая миграция)
- ⏳ Этап 4 — API + миграция фронта с моков (по доменам)
- ⏳ Этап 5 — сидер + smoke + бэкапы
