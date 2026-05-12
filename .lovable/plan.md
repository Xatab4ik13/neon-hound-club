## Цель

Заложить визуальный фундамент HELLHOUND Racing Club: дизайн-система Black Chrome Pink в стиле Underground Tech-Street + одна главная страница. Без авторизации, оплат и БД — это придёт следующими шагами.

## Что будет сделано

### 1. Дизайн-система (src/styles.css)

Палитра Black Chrome Pink в `oklch`:

- `--background` — #050505 (Hell Black)
- `--surface` — #141414 (мокрый асфальт)
- `--card` — #1A1A1A (карбон)
- `--border` — #2A2A2A (тёмная сталь)
- `--foreground` — #EDEDED (белый дым)
- `--muted-foreground` — #A7A7A7 (серебро)
- `--primary` — #E91E63 (Hound Pink, главный акцент)
- `--accent-metal` — #C7C3B8 (пыльная платина)
- `--destructive` — #B00020 (для опасных действий, остаётся в системе)

Радиусы — 8–12px (не пухлые). Селект — розовый.

### 2. Шрифты

Подключаем через Google Fonts в `__root.tsx` (link-теги):

- **Oswald 600/700** — заголовки, капс, condensed гротеск
- **Inter 400/500/600** — основной текст
- **JetBrains Mono 500/700** — таймеры, XP, цифры, технические лейблы

Регистрируем как CSS-переменные `--font-display`, `--font-sans`, `--font-mono`.

### 3. Компоненты бренда (src/components/brand/)

- `Logo.tsx` — `HELL` розовым + `HOUND` светлым, condensed
- `Header.tsx` — fixed nav, blur, ссылки Race Pass / Drop / Garage / Club, кнопка Login (розовая обводка)
- `Footer.tsx` — лого, колонки Shop / Social, копирайт, моно-телеметрия

Кнопки делаем вариантами поверх существующего shadcn `button.tsx`:
- `variant="hound"` — розовая заливка
- `variant="ghost-hound"` — обводка/прозрачная
- `variant="danger"` — красная для критических действий

### 4. Главная страница (src/routes/index.tsx)

Заменяем плейсхолдер. Секции (точно по выбранному прототипу v2):

1. **Hero** — лейбл `Season 01 / Underground Access`, заголовок `HELLHOUND RACING CLUB` (розовое `RACING`), две CTA (Вступить в клуб / Race Pass), правая карточка активного розыгрыша с таймером и превью Project Pink R6.
2. **Drop #01: Founder Series** — заголовок + подпись `666 UNITS ONLY`, 3 карточки товаров (Founder Hoodie, Track Master Gloves, Garage Access Key) с лимитами и статусами.
3. **The Hierarchy / Club** — список из 4 уровней (Rookie / Rider / Pit Crew / Elite) с подсветкой текущего, справа карточка прогресса XP с прогресс-баром.
4. **Footer** — как описано выше.

Все цифры (таймер, XP, цены, остатки) — моно-шрифтом.

### 5. Картинки

3 изображения через `imagegen--generate_image` (fast, jpg, в `src/assets/`):

- `pink-r6.jpg` — модифицированный розово-карбоновый Yamaha R6 в тёмном гараже
- `founder-hoodie.jpg` — чёрное оверсайз худи с минималистичным розовым лого на спине
- `pit-gloves.jpg` — чёрные гоночные перчатки с карбоновыми костяшками и розовыми вставками
- `garage-key.jpg` — карбоновый брелок-ключ с розовым ремешком

Импортируются как ES6 и используются вместо плейсхолдеров.

### 6. SEO

В `__root.tsx` обновляем дефолтный title/description под бренд. На `/` ставим:
- title: `HELLHOUND Racing Club — мерч, Race Pass, гараж`
- description: `Андеграундный мотоклуб. Лимитированные дропы, Race Pass, уровни и XP.`
- og:title, og:description те же
- og:image — `pink-r6.jpg`

### 7. Чего НЕ делаем сейчас

- Не подключаем Cloud / БД / auth
- Не создаём страницы Race Pass, Drops, Club, Garage отдельно (только главная)
- Не делаем корзину, оплату, профиль
- Не пилим админку
- Не трогаем PWA-манифест и пуши

Эти шаги — следующими итерациями, когда вайб главной утверждён.

## Технические детали

- Стек уже на месте: TanStack Start + Vite + Tailwind v4 + shadcn. Ничего не доустанавливаем кроме шрифтов через CDN.
- Цвета пишем в `:root` и `.dark` (оба одинаковые — сайт всегда тёмный).
- Tailwind-классы — только семантические (`bg-background`, `text-foreground`, `bg-primary` и т.д.). Никаких `bg-[#E91E63]` в JSX.
- Структура файлов:
  - `src/styles.css` — токены
  - `src/routes/__root.tsx` — шрифты + meta
  - `src/routes/index.tsx` — главная
  - `src/components/brand/Header.tsx`, `Footer.tsx`, `Logo.tsx`
  - `src/components/ui/button.tsx` — добавить варианты `hound`, `ghost-hound`
  - `src/assets/*.jpg` — 4 сгенерированных изображения
