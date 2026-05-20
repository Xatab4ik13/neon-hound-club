# HELLHOUND Backend

Node 20 + Fastify + Drizzle + Postgres. Авторизация через JWT в httpOnly cookie.

## Стек
- **Fastify 5** — HTTP сервер
- **Drizzle ORM** — типобезопасные запросы к Postgres (никаких ORM-привязок к Supabase)
- **Argon2id** — хеш паролей
- **jose** — JWT (HS256)
- **Zod** — валидация входа

## Эндпоинты (v1)
- `POST /auth/register` — `{ email, password, displayName }`
- `POST /auth/login` — `{ email, password }`
- `POST /auth/logout`
- `GET  /auth/me` (требует cookie)
- `GET  /health`

## Деплой на VPS (первый раз)

Предполагается, что Postgres уже работает в `/opt/hellhound/docker-compose.yml` (контейнер `hh-postgres`, порт `127.0.0.1:5432`).

```bash
# 1) Клонируем репо (нужен ssh-ключ или public repo)
cd /opt
git clone <REPO_URL> hellhound-app
cd hellhound-app/backend

# 2) .env
cp .env.example .env
nano .env
# - DATABASE_URL: подставь POSTGRES_PASSWORD из /opt/hellhound/.env
#   и хост: host.docker.internal (если бэк в docker) ИЛИ 127.0.0.1 (если node напрямую)
# - JWT_SECRET: openssl rand -base64 48
# - CORS_ORIGINS: оставь как есть пока нет домена

# 3) Применяем миграции (один раз)
npm install
npx drizzle-kit generate
npm run db:migrate

# 4) Запуск через docker (рекомендую)
docker build -t hh-backend .
docker run -d --name hh-backend \
  --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  --env-file .env \
  -p 127.0.0.1:3001:3001 \
  hh-backend

# 5) Проверка
curl http://127.0.0.1:3001/health
```

## Nginx (минимум, без TLS пока нет домена)

```nginx
server {
  listen 80;
  server_name 186.246.7.78;  # потом заменим на api.hhr.pro

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

После получения домена `hhr.pro`:
1. DNS `api.hhr.pro A 186.246.7.78`
2. `certbot --nginx -d api.hhr.pro`
3. В `.env` обновить `COOKIE_DOMAIN=.hhr.pro` и перезапустить контейнер.

## Обновление кода (CI/CD руками)

```bash
cd /opt/hellhound-app
git pull
cd backend
docker build -t hh-backend .
docker stop hh-backend && docker rm hh-backend
docker run -d --name hh-backend \
  --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  --env-file .env \
  -p 127.0.0.1:3001:3001 \
  hh-backend
# если меняли schema.ts:
npm run db:migrate
```
