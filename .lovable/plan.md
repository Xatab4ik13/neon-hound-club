# Fly-to-cart анимация (iOS-style, без лагов)

## Цель
При тапе «В корзину» юзер видит, как мини-копия товара по дуге улетает к иконке корзины в правом верхнем углу. Корзина в этот момент пульсирует, badge делает bump. Никаких лагов даже на слабом телефоне в PWA.

## Как это будет выглядеть
1. Тап по кнопке → лёгкий haptic, кнопка делает iOS-press (scale 0.96).
2. От центра кнопки отрывается круглая превью (40×40, картинка товара, скруглённая, с тенью).
3. Летит по дуге к иконке корзины 550 мс, по пути уменьшается до 12px и затухает.
4. В момент «прилёта» — badge корзины делает bump (scale 1 → 1.25 → 1, 250 мс), иконка коротко подсвечивается primary-glow.
5. `cart.add()` вызывается сразу при тапе (не ждём анимацию) — данные не блокируются визуалом.

## Что делаем (минимум файлов)

### 1. `src/components/club/FlyToCart.tsx` (новый)
Императивный API через React-портал в `<body>`:
- `flyToCart({ fromRect, imageUrl })` — функция, которую можно дёрнуть откуда угодно.
- Находит target по `document.querySelector('[data-cart-anchor]')`, берёт его `getBoundingClientRect()`.
- Если target не найден → no-op (fallback на существующий toast).
- Создаёт абсолютно позиционированный `<div>` с `position: fixed`, размер 40×40, `background-image: url(...)`, `border-radius: 50%`, `box-shadow`.
- Анимирует через **Web Animations API** (`element.animate([...], { duration: 550, easing: 'cubic-bezier(.5,-0.3,.7,.3)' })`) — это GPU, не дёргает React, не вызывает re-renders. По завершении удаляет элемент.
- Дуга: keyframes на `transform: translate(x,y) scale(s)` + `opacity`. Промежуточный кадр на 40% времени смещён вверх на `-80px` от прямой линии → даёт «горку».
- `will-change: transform, opacity` ставится на старте, снимается на финише.

**Почему не лагает:**
- Только `transform` + `opacity` (composited слои, без layout/paint).
- Web Animations API работает в браузерном compositor thread.
- Никаких `setState` во время полёта.
- Элемент один, удаляется после.

### 2. `src/hooks/use-haptic.ts` — уже есть, переиспользуем.

### 3. `src/components/club/MobileTopBar.tsx` (edit)
- На иконке корзины добавить `data-cart-anchor` (атрибут на ссылку `<Link to="/club/cart">`).
- Badge получает `key={cartCount}` + класс с keyframe `animate-cart-bump` (новый, в `styles.css`) — bump срабатывает на каждое изменение count.
- Glow-пульс иконки: слушаем кастомное событие `hh:cart:landed` (диспатчим из `FlyToCart` в момент финиша) → добавляем класс на 400 мс через `useState`/таймер.

### 4. `src/styles.css`
Добавить два keyframe:
```css
@keyframes cart-bump { 0%{transform:scale(1)} 40%{transform:scale(1.25)} 100%{transform:scale(1)} }
@keyframes cart-glow { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 16px var(--primary)} }
```

### 5. Интеграция в кнопках «В корзину»
Два места:
- `src/routes/club.shop.$productSlug.tsx` — кнопка покупки на странице товара.
- `src/routes/club.shop.index.tsx` — кнопка «+» на карточке в листинге (если есть; иначе тап по карточке не меняем).

Обёртка одинаковая:
```tsx
const btnRef = useRef<HTMLButtonElement>(null);
const onAdd = () => {
  haptic('light');
  flyToCart({ fromRect: btnRef.current!.getBoundingClientRect(), imageUrl: product.image });
  cart.add({...});
};
```

### 6. Fallback и edge cases
- **Корзина не на экране** (десктоп, переход между роутами): `flyToCart` возвращает `false` → показываем существующий toast «Добавлено · Открыть корзину».
- **`prefers-reduced-motion: reduce`**: пропускаем полёт, только badge bump + toast.
- **Быстрые повторные тапы**: каждый полёт — отдельный DOM-элемент, не мешают друг другу, badge `key={count}` рестартит анимацию.
- **PWA standalone**: всё работает идентично, никаких popup'ов и navigations.

## Что НЕ трогаем
- Логику `useCart`, бэкенд, любые роуты, layout.
- Условие `isShop` в `MobileTopBar` — оставляем как есть (юзер уже на shop-странице в момент добавления, корзина видна; глобальную видимость не вводим в этой итерации).
- Не добавляем зависимости (`framer-motion`, `gsap` и т.п.) — Web Animations API нативный.

## Файлы
- ✏️ `src/components/ios/` — не трогаем
- 🆕 `src/components/club/FlyToCart.tsx` (~80 строк)
- ✏️ `src/components/club/MobileTopBar.tsx` (data-атрибут + bump key + glow листенер, ~10 строк)
- ✏️ `src/styles.css` (2 keyframe, +1 утилита `.cart-icon-glow`)
- ✏️ `src/routes/club.shop.$productSlug.tsx` (ref + вызов flyToCart перед `cart.add`)
- ✏️ `src/routes/club.shop.index.tsx` (то же на карточке, если есть кнопка «+»)

Готов перейти в build и сделать всё одним проходом.
