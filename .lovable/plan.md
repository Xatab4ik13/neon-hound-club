# План: Клуб как настоящее iOS PWA

## Этап 1 — Полировка iOS-ощущения (UX/анимации)

Сейчас mobile-клуб «выглядит как iOS, но ведёт себя как сайт». Чиним базу.

### 1.1 Тач-фидбек и жесты
- Убрать hover-эффекты на тач-устройствах (`@media (hover: hover)` гварды на всех `hover:` классах в клубных компонентах).
- Добавить `active:scale-[0.97]` + `transition-transform` на все интерактивные карточки/кнопки (товар, миссия, билет, кнопки в Tab Bar).
- `-webkit-tap-highlight-color: transparent` глобально для `.club-*`.
- `touch-action: manipulation` чтобы убрать 300ms задержку.
- `user-select: none` на UI-чрому (Tab Bar, заголовки), оставить только на контенте.

### 1.2 Скролл по-эпловски
- `-webkit-overflow-scrolling: touch` + `overscroll-behavior-y: contain` на основных скролл-контейнерах.
- Sticky header клуба: blur backdrop (`backdrop-blur-xl bg-background/70`), тонкая нижняя граница только при скролле > 0.
- Безопасные зоны: `env(safe-area-inset-top/bottom)` для header и Tab Bar (сейчас Tab Bar налезает на home indicator на iPhone).
- Pull-to-refresh отключить на статичных экранах (`overscroll-behavior: none` на body) — иначе бесит «резиновый» баунс на странице, где рефреша нет.

### 1.3 Переходы между экранами
- Лёгкие fade+slide переходы между табами клуба через `motion/react` (`AnimatePresence` на `<Outlet/>` уровне `club.tsx`).
- Карточка товара → детальный экран: shared layout transition (или хотя бы push-slide справа налево как в iOS).
- Bottom sheets (MobileMoreSheet, корзина): springy spring-анимация, drag-to-dismiss.

### 1.4 Производительность (главная причина «лагает»)
- Аудит ре-рендеров в `club.tsx` и Tab Bar (часто рендерится из-за useViewer/useQuery без `select`).
- `content-visibility: auto` на длинных списках (товары, миссии).
- Lazy-load изображений товаров (`loading="lazy"` + правильные размеры, без полноразмерных JPEG).
- Code-split тяжёлых роутов клуба (`shop`, `raffles`, `profile`) — TanStack уже умеет, проверить что не тянем всё в один бандл.

## Этап 2 — PWA (installable + standalone)

### 2.1 Manifest
- `public/manifest.webmanifest`: `display: "standalone"`, `start_url: "/club"`, `scope: "/"`, тема под наш `--background`.
- Иконки 192/512/maskable + apple-touch-icon 180×180.
- `<link rel="manifest">` + `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style="black-translucent"` в `__root.tsx`.
- Splash screens для iOS (генерим набор PNG под популярные iPhone).

### 2.2 Service Worker (по правилам Lovable)
- `vite-plugin-pwa` с `devOptions.enabled: false`.
- Гард регистрации SW: не регать в iframe/preview-домене (иначе сломает редактор).
- `NetworkFirst` для HTML, `CacheFirst` для статики/картинок.
- `navigateFallbackDenylist` для `/api`, `/~oauth`.

### 2.3 Install prompt
- Кнопка «Установить приложение» в профиле клуба (Android — `beforeinstallprompt`, iOS — модалка с инструкцией «Поделиться → На экран Домой»).

## Этап 3 — Push-уведомления

iOS поддерживает Web Push **только** для установленных PWA (iOS 16.4+). Это диктует поток:

### 3.1 Бэкенд (`server/`)
- Таблица `push_subscriptions` (user_id, endpoint, p256dh, auth, platform, created_at).
- Эндпоинты: `POST /api/v1/push/subscribe`, `POST /api/v1/push/unsubscribe`.
- Сервис отправки через `web-push` (VAPID). Секреты: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- Хуки на события: новый розыгрыш, победа в розыгрыше, ответ Hell AI/админа, новый мерч/Race Pass, статус заказа.

### 3.2 Фронт
- В `sw.js`: обработчики `push` (показать notification с иконкой/бейджем) и `notificationclick` (открыть нужный роут клуба).
- На экране профиля клуба — toggle «Уведомления»: запрос permission → `pushManager.subscribe({ applicationServerKey })` → отправка на бек.
- На iOS показывать toggle **только если** `display-mode: standalone` (иначе объяснить что нужно установить PWA сначала).

### 3.3 Админка
- На странице розыгрыша/мерча — чекбокс «Отправить пуш всем участникам клуба» при создании.
- Простой broadcast-эндпоинт `POST /api/v1/admin/push/broadcast` (только для admin role).

## Порядок работ (рекомендую делать раздельными апдейтами)

1. **Этап 1.1–1.2** — тач-фидбек, safe-area, отключить «резину». Быстро, сразу почувствуешь разницу.
2. **Этап 1.3–1.4** — переходы и перф.
3. **Этап 2** — manifest + SW + install prompt. После этого можно ставить на home screen.
4. **Этап 3** — VAPID, подписки, пуши. Это уже отдельная работа с бэком и миграцией.

## Открытые вопросы

1. Иконку/splash берём из существующего лого HHR, или нужна отдельная иконка приложения (закруглённый квадрат под iOS)?
2. На какие события точно хотим пуши в MVP? (мой дефолт: победа в розыгрыше + новый розыгрыш + ответ Hell AI).
3. Делаем install prompt сразу для всех, или только после N посещений / в профиле кнопкой?
