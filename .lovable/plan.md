# /club как iOS-приложение (HELLHOUND noir)

Десктоп **не трогаем** в этой итерации (оставляем текущий sidebar). Всё новое — только на `useIsMobile()`.

## Навигация: bottom tabs 4+1

Анализ всех `/club/*` маршрутов:
Лента, Профиль (Я), Гараж, Билеты, Заказы, Ранг, Квесты, Розыгрыши, Пригласить, Hell AI, Hell Pass, Школа, Настройки, Выйти.

**14 пунктов в bottom tab не помещаются**. Стандарт iOS — 4–5 табов, остальное в «More». Беру самые частые ежедневные действия в табы, всё остальное — за пятой иконкой «Ещё», открывающей iOS-sheet.

```text
┌──────────────────────────────────┐
│ ⌂        🏍       🎟       👤    ⋯ │
│ Лента  Гараж  Билеты   Я     Ещё │
└──────────────────────────────────┘
```

- **Лента** → `/club`
- **Гараж** → `/club/garage`
- **Билеты** → `/club/tickets` (главная валюта клуба, нужна часто)
- **Я** → `/club/me` (профиль + значки)
- **Ещё** → bottom-sheet со списком: Hell AI, Hell Pass, Розыгрыши, Квесты, Заказы, Ранг и XP, Пригласить, Школа, Настройки, Выйти

Активный таб подсвечивается `primary` (red), неактивный — `muted-foreground`. Иконки lucide, под SF-style. Бейдж-точка на «Ещё» если есть незабранные награды/новые квесты.

## iOS-паттерны (всё на мобилке)

1. **Large title header** — на каждом экране сверху: большой заголовок `text-[34px] font-black italic`, при скролле уезжает и схлопывается в компактный nav-bar с тонкой границей `border-b`. Слева — back-chevron на вложенных экранах (`/club/hell-pass/$tier`, `/club/raffles/$raffleId`, `/club/u/$nick`), на корневых табах — аватар.
2. **Push/pop переходы** — обёртка `<AnimatePresence mode="popLayout">` вокруг `<Outlet />` с translateX-анимацией (вперёд: вправо→центр, назад: центр→вправо), 280мс, ease-out. Глубина считается по длине pathname-сегментов.
3. **Bottom sheets вместо модалок** — `SettingsModal`, `BikeFormModal`, `BloggerProfileModal` переезжают на `vaul` Drawer с drag-handle сверху, snap-points, безопасной зоной.
4. **List rows вместо карточек** на экранах-списках (Заказы, Билеты-история, Настройки, Ещё): сгруппированные строки на `bg-card/40` с `divide-y divide-white/[0.05]`, иконка слева, тайтл + сабтайтл, chevron справа.
5. **Safe-area** — `pb-[env(safe-area-inset-bottom)]` под tab-bar, `pt-[env(safe-area-inset-top)]` под header.
6. **Touch polish** — `active:scale-[0.97]` на всех тач-таргетах, мин. высота 44px, haptic-like микро-анимации.

## Типографика и тон под iOS

- Large title: `text-[34px] font-black italic uppercase` (HELLHOUND характер сохранён)
- Section header: `text-[22px] font-black italic`
- Body: `text-[17px]` (iOS стандарт), не меньше `text-[15px]` нигде
- Caption: `text-[13px] uppercase tracking-wider font-mono` (наш racing-акцент)
- Цвет фона остаётся `--background` (noir), primary остаётся red

## Изменения в файлах

**Новые:**
- `src/components/club/MobileTabBar.tsx` — фиксированный bottom tab-bar, 4 таба + «Ещё»
- `src/components/club/MobileMoreSheet.tsx` — vaul Drawer с остальной навигацией
- `src/components/club/MobileScreen.tsx` — обёртка экрана: large title + scroll-collapse + safe-area + back-chevron
- `src/components/club/MobileTransition.tsx` — AnimatePresence + translateX для push/pop
- `src/components/club/MobileListRow.tsx` — переиспользуемая iOS-list-row

**Правим:**
- `src/routes/club.tsx` — на мобилке рендерим `<MobileTransition><Outlet/></MobileTransition>` + `<MobileTabBar/>` вместо текущего drawer/sidebar layout. Десктоп — без изменений.
- Все `src/routes/club.*.tsx` — оборачиваем контент в `<MobileScreen title="...">` (на мобилке), на десктопе оставляем текущий `<PageHeader>`. Делаем через единый компонент, чтобы не дублировать.
- `PageHeader.tsx` → расширяем: на мобилке = large-title-режим, на десктопе = как сейчас.

**НЕ трогаем** в этой итерации:
- Десктопный sidebar и десктопный layout `club.tsx`
- Контент страниц (только обёртки/шрифты)
- PWA, manifest, service worker — отдельная следующая задача
- Бэкенд, данные, бизнес-логику

## После этой итерации (следующие шаги)

1. Перевод оставшихся модалок на sheets (SettingsModal, BikeFormModal, BloggerProfileModal)
2. PWA-installable (manifest + icons, без service worker — по правилам Lovable)
3. Pull-to-refresh на ленте

---

Дай добро («погнали») или скажи, что переставить в табах. Например, можно поменять «Билеты» на «Hell Pass» или «Розыгрыши», если ты считаешь их важнее ежедневно.