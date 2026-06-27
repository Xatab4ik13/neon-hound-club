# Аудит навигации PWA и план улучшений

Прошёл по всем основным маршрутам клуба (`/club`, `/club/shop`, `/club/tickets`, `/club/garage`, `/club/me`, `/club/quests`, `/club/raffles`, `/club/hell-ai`, `/club/invite`, `/club/hell-pass`, `/club/school`, `/club/cart`, `/club/orders`, `/club/help`, `/club/install`) в мобильном вьюпорте, плюс перечитал ядро навигации (`router.tsx`, `routes/club.tsx`, `MobileTransition.tsx`, `MobileTabBar.tsx`, `use-edge-swipe-back.ts`, оба `sw.js` / `service-worker.js`).

Фатальных багов нет, маршруты возвращают 200. Но в PWA-режиме набирается ~10 мелких поведений, которые «выдают веб» и ломают ощущение нативного iOS-приложения. Сгруппировал по приоритетам — реализую только после твоего апрува, по пунктам.

---

## Tier 1 — то, что бьёт по ощущению прямо сейчас

### 1. Анимация перехода между вкладками TabBar выглядит «не нативно»
`MobileTransition` считает «глубину» пути: переход между вкладками одного уровня (`/club` ↔ `/club/shop` ↔ `/club/tickets` ↔ `/club/garage`) попадает в ветку `direction === 0` → cross-fade на 180 мс. На настоящем iOS вкладки переключаются **мгновенно, без анимации**. Cross-fade на табах = «веб».
**Фикс:** для переходов между корнями вкладок (`/club`, `/club/shop`, `/club/tickets`, `/club/garage`) отключить анимацию полностью — `initial=false`, мгновенная замена. Slide оставить только для push/pop (вкладка → подстраница и обратно).

### 2. Повторный тап по активной вкладке ничего не делает
Стандарт iOS: тап по уже активной вкладке скроллит её к началу (и закрывает открытые модалки/sheet'ы внутри). Сейчас `MobileTabBar` просто игнорирует тап по активной (`if (!active) haptic(...)`), `<Link>` к тому же пути — no-op.
**Фикс:** при тапе по активной вкладке — `window.scrollTo({top:0, behavior:'smooth'})` + лёгкий хаптик. Для ленты дополнительно дёргать `feedStore.refresh()` опционально (обсудим).

### 3. Scroll restoration ломает slide-анимацию
В `router.tsx` включён `scrollRestoration: true`. При back-навигации новый layer въезжает с `x: -30% → 0`, а скролл восстанавливается **после** маунта → видно прыжок контента в момент завершения анимации. Особенно заметно на длинной ленте.
**Фикс:** восстанавливать `scrollTop` синхронно в `useLayoutEffect` начального состояния `motion.div` (до старта анимации), либо отключить `scrollRestoration` у роутера и хранить скролл вручную в Map по pathname.

### 4. Edge-swipe-back уводит из приложения
`useEdgeSwipeBack` дёргает `router.history.back()`. Если юзер открыл подстраницу прямой ссылкой (deep-link из пуша или из браузера) — `history.length > 1`, но `back()` уведёт его обратно в Safari/на пустую страницу. На iOS жест должен fallback'ить на родительский маршрут.
**Фикс:** если `history.state` не помечен как «наш push» — навигировать на родительский путь (`/club/shop/$slug` → `/club/shop`, `/club/orders/$id` → `/club/orders` и т.д.) через `router.navigate`.

### 5. Дубль service-worker'ов
В `public/` лежат `sw.js` (нормальный push-only) и `service-worker.js` (старый kill-switch, делающий `unregister()` + `client.navigate(url)`). Если у кого-то из юзеров остался зарегистрирован старый — он триггерит `navigate` на каждый activate → лишняя перезагрузка PWA-окна, мелькание splash-экрана.
**Фикс:** оставить `service-worker.js` ровно как pure kill-switch (он такой и есть), но убедиться, что нигде в коде он больше не регистрируется. Через 1–2 недели — удалить файл совсем. Проверю, кто его регистрирует, и вычищу.

---

## Tier 2 — заметно при внимательном использовании

### 6. `defaultPreload: "intent"` + `defaultPreloadStaleTime: 0`
На тач-устройствах "intent" = практически клик, выигрыша нет, но каждый hover/tap-down ре-фетчит loader'ы с нуля (stale=0). На медленной сети — двойной запрос.
**Фикс:** `defaultPreloadStaleTime: 30_000` (минута запасного кеша между preload и реальной навигацией).

### 7. PullToRefresh активен на всех страницах, включая формы
`PullToRefresh` обёрнут вокруг `<Outlet>` глобально. На страницах вроде `/club/cart`, `/club/checkout`, `/club/help/new` (формы) случайный pull-to-refresh посреди ввода стирает данные.
**Фикс:** отключать pull-refresh на маршрутах с формами (явный whitelist маршрутов, где он осмыслен: лента, магазин, билеты, гараж, квесты, розыгрыши, заказы).

### 8. Тапы по `<Link>` не дают тактильный отклик
Только TabBar даёт haptic. Переход «карточка товара → страница товара», «комментарий → пост», «коммент аватар → профиль» — без отклика. На iOS PWA это сильно ощущается как «не приложение».
**Фикс:** мини-хелпер `<AppLink>` поверх TanStack `Link`, который на mousedown/touchstart даёт `haptic("light")`. Прогнать по основным навигационным переходам в клубе.

### 9. Нет кнопки «назад» в MobileTopBar на подстраницах
Edge-swipe — хорошо, но не все знают про жест, и в PWA на Android жеста с края нет. На подстраницах (`/club/shop/$slug`, `/club/orders/$id`, `/club/p/$postId`, `/club/help/$ticketId`, `/club/raffles/$id`, `/club/hell-pass/$tier`) нужна явная стрелка ←.
**Фикс:** в `MobileTopBar` показывать back-arrow на любом пути глубже `/club/<root>` и на listing-страницах вести через `router.navigate` на родителя (не `history.back()` — см. п.4).

### 10. `min-h-full` на анимируемом слое
`<motion.div className="min-h-full">` в `MobileTransition` — у `<main>` нет явной высоты, поэтому `min-h-full` = 0. В момент `exit` старый слой схлопывается, бывает кратковременный «пустой» хвост под контентом до нижнего таб-бара.
**Фикс:** добавить `min-h-[100dvh]` на motion-обёртку и `position:relative` + `min-h-[100dvh]` на `<main>`. Анимация перестанет «откусывать» низ страницы.

---

## Tier 3 — мелочи и инфраструктура

### 11. Heavy backdrop-filter на TabBar
`bg-black/75 backdrop-blur-2xl backdrop-saturate-150` — две тяжёлых GPU-операции на фиксированном элементе. На iOS PWA при скролле длинной ленты заметные просадки FPS у iPhone XR/SE.
**Фикс:** уменьшить до `backdrop-blur-xl` (или вообще `backdrop-blur-md`) + `bg-black/85` для компенсации прозрачности. Визуально почти не отличается, скролл становится плавнее.

### 12. `_redirects` в `public/`
Файл бесполезный для Lovable-хостинга (там SPA-fallback встроен), но и не вредит. Можно удалить, чтобы не путал.

### 13. Боевые `console.warn` от TanStack про code-split
`shop-info.tsx` и `club.hell-ai.tsx` экспортируют `ShopInfoPage` / `HellAiPage` помимо `Route` — TanStack ругается, эти экспорты не code-split'ятся и раздувают бандл. Перенести компоненты в отдельные файлы вне `src/routes/`.

### 14. Префетч ассетов вкладок
Сейчас при холодном входе на `/club` бандлы `/club/shop`, `/club/tickets`, `/club/garage` тянутся только при hover/touch. Для PWA имеет смысл при `idle` префетчить чанки 4 главных вкладок — переключение станет мгновенным.
**Фикс:** в layout клуба `requestIdleCallback(() => router.preloadRoute(...))` для четырёх корневых вкладок.

---

## Технический раздел (для меня, не для тебя)

```text
src/router.tsx                 — defaultPreloadStaleTime: 30_000
src/routes/club.tsx            — PullToRefresh whitelist, idle-preload tabs
src/components/club/
  MobileTransition.tsx         — TAB_ROOTS set, skip animation для tab↔tab
                                 layout-effect scroll restore
  MobileTabBar.tsx              — scrollToTop on re-tap of active
  MobileTopBar.tsx              — back-arrow на подстраницах
src/hooks/use-edge-swipe-back.ts — fallback на parent path вместо history.back
src/components/ui/AppLink.tsx   — новый: Link + haptic
public/service-worker.js        — проверить, что нигде не регистрируется
```

---

Это полный список. Я ничего не трогаю до твоего апрува. **Если хочешь — апрувни план целиком, и я пойду по Tier 1 → Tier 2 → Tier 3.** Либо скажи, какие пункты выкинуть / какие сделать первыми.
