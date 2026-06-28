Переход с lucide-react на Streamline Core Solid делаем поэтапно, без одного большого прохода (он уже падал по таймауту).

## Принцип

1. Создаём один файл `src/components/ui/icons.tsx` — это единая точка иконок проекта.
2. Каждая иконка там — это React-компонент с тем же именем, что и в lucide (`Check`, `X`, `Settings` и т.д.), и тем же API (`size`, `className`, `color`, `strokeWidth` игнорируется).
3. Импорты в коде меняем с `from "lucide-react"` на `from "@/components/ui/icons"` — построчно, файлами, партиями.
4. Пока иконка не перенесена в `icons.tsx` — она временно ре-экспортится из lucide, чтобы ничего не сломалось. Удалим lucide только в самом конце.

Таким образом на каждом этапе билд зелёный, и я могу остановиться/откатиться на любом шаге.

## Этапы

**Этап 0 — каркас (10 мин, без визуальных изменений)**
- Создаю `src/components/ui/icons.tsx` с ре-экспортом всех 96 иконок из lucide-react как есть.
- Прогоняю замену импортов во всём `src/` (`lucide-react` → `@/components/ui/icons`).
- Билд должен быть зелёный, визуально ничего не поменяется.
- Это даёт мне один файл, через который я дальше подменяю иконки по одной.

**Этап 1 — топ-20 ключевых иконок Streamline (то, что глаз цепляет сразу)**

Навигация и базовый UI:
`Check`, `X`, `ChevronDown`, `ChevronLeft`, `ChevronRight`, `ChevronUp`, `ArrowLeft`, `ArrowRight`, `Search`, `Settings`, `LogOut`, `User`, `Users`, `Bell`, `Plus`, `Minus`, `MoreHorizontal`, `Trash2`, `Edit`, `Heart`

Для каждой:
- ищу в Streamline Core Solid вручную через API (с проверкой по названию + ручной white-list на проблемные: `X`=close-cross, `Zap`=lightning, `MoreHorizontal`=three-dots),
- качаю SVG, кладу как inline React-компонент в `icons.tsx` поверх ре-экспорта,
- проверяю билд после партии.

**Этап 2 — фид и соц-активность (~15 иконок)**
`MessageCircle`, `Share`, `Share2`, `Send`, `Eye`, `EyeOff`, `Pin`, `PinOff`, `Flag`, `Bookmark/Sticker`, `Camera`, `Image`, `Paperclip`, `Play`, `Volume2`, `VolumeX`

**Этап 3 — гейм-слой (Pass, билеты, тиры) (~12 иконок)**
`Ticket`, `Trophy`, `Crown`, `Award`, `Gift`, `Sparkles`, `Zap`, `Lightbulb`, `Bot`, `ShieldCheck`, `KeyRound`, `Lock`

**Этап 4 — мерч и заказы (~10 иконок)**
`ShoppingBag`, `Package`, `Truck`, `Tag/Sticker`, `Copy`, `Download`, `Upload`, `ExternalLink`, `Clock`, `Calendar`

**Этап 5 — мото/сервис/диагностика (~10 иконок)**
`Bike`, `Wrench`, `Bug`, `MapPin`, `Phone`, `Smartphone`, `WifiOff`, `RefreshCw`, `RotateCcw`, `Save`

**Этап 6 — оставшийся хвост (~20 иконок)**
Алерты, чарты, бренд-логотипы (`Youtube`, `Instagram`, `Twitch`, `Apple`), `Loader2`, `GripVertical`, `PanelLeft`, `SlidersHorizontal`, `BarChart3`, `Newspaper`, `TrendingUp`, `Ban`, `HelpCircle`, `AlertCircle`, `AlertTriangle`, `CheckCircle2`, `XCircle`, `Circle`, `Pencil`.

**Этап 7 — финальная уборка**
- Убираю ре-экспорт из lucide в `icons.tsx`.
- `bun remove lucide-react`.
- Финальный билд + визуальный обход главной, фида, профиля, админки.

## Что я делаю сейчас

Только **Этап 0 + Этап 1** в этом сообщении (каркас + 20 ключевых иконок). После этого ты смотришь на превью, и если ок — идём дальше партиями по этапам.

## Техническая часть (для справки)

- API: `https://api.streamlinehq.com/v3/families/core-solid/icons?search=<query>` с `Authorization: Bearer $STREAMLINE_API_KEY` (ключ уже в `add_secret`).
- Скачивание SVG: эндпоинт `download/svg` для выбранного hash.
- SVG чищу: убираю `width/height`, ставлю `fill="currentColor"`, оборачиваю в `React.forwardRef` с пропсами `{size=24, className, ...rest}` → `<svg width={size} height={size} className={className} viewBox=... {...rest}>`.
- `LucideIcon` тип ре-экспортирую как `ComponentType<{size?: number; className?: string}>` чтобы существующие сигнатуры (`icon: LucideIcon`) продолжали работать.
- Бренд-логотипы (`Youtube`, `Instagram`, `Twitch`, `Apple`) — в Streamline Core Solid скорее всего отсутствуют как бренды, оставлю из lucide или возьму из Streamline `logos` family отдельно. Решу на Этапе 6.
