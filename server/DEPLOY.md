# Деплой бекенда на VPS — пошагово

Репо: `https://github.com/Xatab4ik13/neon-hound-club.git`
Домен API: `api.hhr.pro` (A-запись уже смотрит на VPS)
Фронт: `hhr.pro` (Timeweb Apps, авто-деплой)

Всё делается под root по SSH на VPS. Если не root — добавляй `sudo` перед каждой командой.

---

## Шаг 1. Зайти на VPS

С твоего ноута:

```bash
ssh root@<IP_VPS>
```

Дальше ВСЕ команды — внутри VPS.

---

## Шаг 2. Поставить Docker + git (один раз, если ещё нет)

```bash
apt update && apt install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

Если последняя строка показывает версии — ок.

---

## Шаг 3. Склонировать репо

```bash
cd /opt
git clone https://github.com/Xatab4ik13/neon-hound-club.git hellhound
cd hellhound/server
```

Если репо приватный — git попросит логин/пароль (используй Personal Access Token GitHub вместо пароля).

---

## Шаг 4. Создать `.env` с секретами

```bash
cp .env.example .env
nano .env
```

Заполни эти поля (остальное оставь по умолчанию):

```
NODE_ENV=production
PORT=3000

# База
POSTGRES_USER=hellhound
POSTGRES_PASSWORD=<ПРИДУМАЙ_ДЛИННЫЙ_ПАРОЛЬ>
POSTGRES_DB=hellhound
DATABASE_URL=postgres://hellhound:<ТОТ_ЖЕ_ПАРОЛЬ>@postgres:5432/hellhound

# JWT — сгенерируй командой ниже и вставь сюда
JWT_SECRET=<СЮДА_СЕКРЕТ_64+_СИМВОЛА>
COOKIE_DOMAIN=.hhr.pro

# CORS — фронт
FRONTEND_URL=https://hhr.pro

# MinIO (S3-совместимое хранилище медиа)
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=hellhound
S3_ACCESS_KEY=hellhound
S3_SECRET_KEY=<ПРИДУМАЙ_ДЛИННЫЙ_ПАРОЛЬ>
S3_PUBLIC_URL=https://media.hhr.pro
```

Сгенерировать JWT_SECRET (выполни и скопируй вывод в `.env`):

```bash
openssl rand -hex 48
```

Сохранить в `nano`: `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## Шаг 5. Запустить контейнеры

```bash
docker compose up -d --build
docker compose ps
```

Должны быть 4 контейнера в статусе `Up`: `postgres`, `redis`, `minio`, `api`.

Проверь, что API живой:

```bash
curl http://127.0.0.1:3000/healthz
```

Ожидаемый ответ: `{"ok":true}`.

Если что-то упало — смотри логи:

```bash
docker compose logs -f api
```

---

## Шаг 6. Nginx + HTTPS для `api.hhr.pro`

```bash
apt install -y nginx certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/api.hhr.pro <<'NGINX'
server {
    listen 80;
    server_name api.hhr.pro;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/api.hhr.pro /etc/nginx/sites-enabled/api.hhr.pro
nginx -t && systemctl reload nginx

certbot --nginx -d api.hhr.pro --non-interactive --agree-tos -m admin@hhr.pro --redirect
```

Проверка снаружи (с ноута):

```bash
curl https://api.hhr.pro/healthz
```

Должно вернуть `{"ok":true}`.

---

## Шаг 7. Что делать при каждом новом коммите от Lovable

На VPS:

```bash
cd /opt/hellhound
git pull
cd server
docker compose up -d --build
docker compose logs -f api   # Ctrl+C чтобы выйти
```

Всё. Фронт обновляется сам на Timeweb, бекенд — этими 4 командами.

---

## Полезные команды

| Что | Команда |
|---|---|
| Логи API в реальном времени | `docker compose logs -f api` |
| Логи всех сервисов | `docker compose logs -f` |
| Перезапустить только API | `docker compose restart api` |
| Зайти в Postgres | `docker compose exec postgres psql -U hellhound -d hellhound` |
| Остановить всё | `docker compose down` |
| Бэкап БД | `docker compose exec -T postgres pg_dump -U hellhound hellhound > backup_$(date +%F).sql` |

---

## Что дальше (этап 2)

После того как `curl https://api.hhr.pro/healthz` вернёт `{"ok":true}` — пиши «healthz ок», и я делаю этап 2: таблицы users/sessions, эндпоинты `/auth/signup` `/auth/login` `/auth/logout` `/auth/me`, и переключаю фронт `/login` и `/signup` со старого Supabase-кода на новый бекенд.
