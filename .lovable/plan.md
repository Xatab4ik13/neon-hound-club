Инструкция: подключение Cloudflare (CDN + защита origin IP) для hhr.pro и api.hhr.pro

Цель
----
Скрыть реальный IP сервера (186.246.7.78) за CDN Cloudflare, чтобы ТСПУ и сканеры не видели origin напрямую. Улучшить доступность сайта из разных регионов и операторов РФ.

Архитектура после настройки
----------------------------
```text
Пользователь → Cloudflare (CDN, SSL, DDoS) → Timeweb Apps (фронт, 46.19.64.95)
Пользователь → Cloudflare (CDN, SSL, DDoS) → VPS Nginx (API, 186.246.7.78)
```

Шаг 1. Подготовка
-----------------
Нужно узнать, где сейчас управляются DNS-записи для домена `hhr.pro`:
- В панели регистратора домена (timeweb, reg.ru, nic.ru и т.д.)?
- В панели Timeweb (если домен куплен/делегирован туда)?

Запиши текущие записи (мы их уже посмотрели):
- `hhr.pro` A → `46.19.64.95`
- `www.hhr.pro` A → `46.19.64.95`
- `api.hhr.pro` A → `186.246.7.78`
- `hhr.pro` MX → `mx1.timeweb.ru`, `mx2.timeweb.ru`
- `hhr.pro` TXT → `v=spf1 include:_spf.timeweb.ru ~all`

Шаг 2. Регистрация в Cloudflare
--------------------------------
1. Открыть https://dash.cloudflare.com/sign-up
2. Зарегистрироваться (email + пароль)
3. Нажать "Add a site" / "Добавить сайт"
4. Ввести: `hhr.pro`
5. Выбрать тариф: **Free** (достаточно для начала)

Шаг 3. Перенос DNS-записей в Cloudflare
----------------------------------------
Cloudflare просканирует текущие записи. Проверь и добавь недостающие:

- **A @** → `46.19.64.95` (оранжевое облачко 🟧 = проксирование ВКЛ)
- **A www** → `46.19.64.95` (оранжевое облачко 🟧 = проксирование ВКЛ)
- **A api** → `186.246.7.78` (оранжевое облачко 🟧 = проксирование ВКЛ)
- **MX** → `mx1.timeweb.ru` (приоритет 10) — серое облачко ☁️ (без прокси)
- **MX** → `mx2.timeweb.ru` (приоритет 20) — серое облачко ☁️ (без прокси)
- **TXT** → `v=spf1 include:_spf.timeweb.ru ~all` — серое облачко ☁️

⚠️ **Важно:** записи MX и TXT нельзя проксировать (оранжевое облачко), иначе почта сломается.

Шаг 4. Смена NS у регистратора домена
--------------------------------------
Cloudflare выдаст 2 именных сервера (NS), например:
- `bob.ns.cloudflare.com`
- `lara.ns.cloudflare.com`

1. Зайди в панель управления доменом (там, где покупал/делегировал `hhr.pro`)
2. Найди раздел "Управление DNS" или "NS-серверы" / "Name servers"
3. Замени текущие NS на те, что дал Cloudflare
4. Сохрани

Обычно обновление занимает от 1 до 24 часов (иногда быстрее).

Шаг 5. Настройка SSL/TLS в Cloudflare
---------------------------------------
1. В панели Cloudflare → домен `hhr.pro` → вкладка **SSL/TLS**
2. Выбрать режим: **Full (strict)**
   - Почему: шифрование от пользователя до Cloudflare И от Cloudflare до твоего сервера
   - Твои сертификаты Let's Encrypt на `api.hhr.pro` и `hhr.pro` останутся рабочими
3. Вкладка **Edge Certificates** — убедись, что SSL для `*.hhr.pro` активен (обычно автоматически)

Шаг 6. Настройка nginx на VPS (api.hhr.pro)
---------------------------------------------
Этот шаг я могу сделать за тебя, если дашь SSH. Или скинь конфиг — я покажу что поменять.

Что нужно:
1. **Убрать/изменить заголовок Server**
   ```nginx
   server_tokens off;
   ```
   (в `/etc/nginx/nginx.conf` внутри блока `http {}`)

2. **Добавить доверенные IP Cloudflare** (чтобы nginx видел реальный IP пользователя, а не IP Cloudflare):
   ```nginx
   # В http {} блоке
   set_real_ip_from 173.245.48.0/20;
   set_real_ip_from 103.21.244.0/22;
   set_real_ip_from 103.22.200.0/22;
   set_real_ip_from 103.31.4.0/22;
   set_real_ip_from 141.101.64.0/18;
   set_real_ip_from 108.162.192.0/18;
   set_real_ip_from 190.93.240.0/20;
   set_real_ip_from 188.114.96.0/20;
   set_real_ip_from 197.234.240.0/22;
   set_real_ip_from 198.41.128.0/17;
   set_real_ip_from 162.158.0.0/15;
   set_real_ip_from 104.16.0.0/13;
   set_real_ip_from 104.24.0.0/14;
   set_real_ip_from 172.64.0.0/13;
   set_real_ip_from 131.0.72.0/22;
   set_real_ip_from 2400:cb00::/32;
   set_real_ip_from 2606:4700::/32;
   set_real_ip_from 2803:f800::/32;
   set_real_ip_from 2405:b500::/32;
   set_real_ip_from 2405:8100::/32;
   set_real_ip_from 2a06:98c0::/29;
   set_real_ip_from 2c0f:f248::/32;
   real_ip_header CF-Connecting-IP;
   ```
   Или установи пакет `nginx-module-cloudflare` / `libnginx-mod-http-realip` если есть в репозитории.

3. **(Опционально, но желательно) Закрыть прямой доступ к origin**
   После переезда на Cloudflare можно настроить firewall (ufw/iptables) на VPS, чтобы порты 80/443 принимали соединения ТОЛЬКО с IP-диапазонов Cloudflare. Это скроет origin полностью. Но осторожно: если забудешь обновить список IP Cloudflare, сайт упадёт.

Шаг 7. Проверка
----------------
После смены NS и включения проксирования:
1. Открой `https://hhr.pro` — должен работать
2. Открой `https://api.hhr.pro/healthz` — должен вернуть `{"ok":true}`
3. Проверь: `nslookup api.hhr.pro` — теперь должен показывать IP Cloudflare (например, `104.21.x.x` или `172.67.x.x`), а не `186.246.7.78`
4. Проверь авторизацию на сайте (login/logout) — cookie домена `.hhr.pro` должны работать как раньше
5. Проверь загрузку медиа `/media/*`

Шаг 8. Дополнительно (рекомендую)
----------------------------------
- **Always Use HTTPS** в Cloudflare (SSL/TLS → Edge Certificates) — редирект с HTTP на HTTPS
- **Automatic HTTPS Rewrites** — заменяет http:// на https:// в HTML
- **Brotli** — вкладка Speed → Optimization → Content optimization → Brotli = ON
- **Caching** — вкладка Caching → Configuration → Browser cache TTL: 4 часа (для статики)

Что может пойти не так
----------------------
- **Почта:** если MX проксируются (оранжевое облачко), почта перестанет ходить. Обязательно оставь MX серыми.
- **SSL:** если выбрать "Flexible", а не "Full (strict)", может сломаться авторизация (cookie не будут передаваться корректно). Выбирай Full (strict).
- **WebSockets / Realtime:** если используешь WebSockets, нужно включить в Cloudflare: Network → WebSockets = ON (обычно уже ON).

Кто делает что
--------------
- **Ты:** регистрация в Cloudflare, смена NS у регистратора домена, базовые настройки в панели Cloudflare (шаги 1-5)
- **Я (или ты по моей инструкции):** правка nginx на VPS (шаг 6), проверка (шаг 7)

Если готов — скажи, с какого шага начнём. Если хочешь, чтобы я сделал правку nginx — дай вывод `cat /etc/nginx/sites-available/api.hhr.pro` и `cat /etc/nginx/nginx.conf` с VPS.