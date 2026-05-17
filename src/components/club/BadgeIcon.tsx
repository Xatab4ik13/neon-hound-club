// SVG-марки значков. Каждый id из BADGES имеет свой геометрический знак.
// Цвет берётся из `color` (родительский redкость-цвет).

type Props = {
  id: string;
  color: string;
  size?: number;
};

export function BadgeIcon({ id, color, size = 36 }: Props) {
  const s = size;
  const stroke = color;
  switch (id) {
    case "founder-s01":
      // Череп с короной — мифик
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M14 6 L18 10 L24 4 L30 10 L34 6 L32 14 L36 16 L34 26 L30 30 L30 36 L24 40 L18 36 L18 30 L14 26 L12 16 L16 14 Z"
            stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="20" cy="22" r="2.4" fill={stroke} />
          <circle cx="28" cy="22" r="2.4" fill={stroke} />
          <path d="M22 30 L26 30" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "platinum-s01":
    case "gold-s01":
    case "silver-s01":
      // Бриллиант — Pass-tier
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M10 18 L24 6 L38 18 L24 42 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 18 L38 18 M18 18 L24 42 L30 18 M24 6 L18 18 M24 6 L30 18"
            stroke={stroke} strokeWidth="1.3" />
        </svg>
      );
    case "first-win":
      // Кубок
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M14 8 H34 V18 A10 10 0 0 1 14 18 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M14 12 H8 V16 A6 6 0 0 0 14 22 M34 12 H40 V16 A6 6 0 0 1 34 22"
            stroke={stroke} strokeWidth="2" />
          <path d="M20 30 H28 V36 H32 V40 H16 V36 H20 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "hells-howl":
      // Волк / молния
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M8 14 L18 6 L22 12 L26 12 L30 6 L40 14 L36 22 L40 28 L34 38 L24 34 L14 38 L8 28 L12 22 Z"
            stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 22 L24 26 L28 22 M18 18 L22 14 L26 18" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "ticket-hunter":
      // Билет с прорезью
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M6 14 V18 A2 2 0 0 1 6 22 V26 A2 2 0 0 1 6 30 V34 H42 V30 A2 2 0 0 1 42 26 V22 A2 2 0 0 1 42 18 V14 Z"
            stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 14 V34 M32 14 V34" stroke={stroke} strokeWidth="1.5" strokeDasharray="2 3" />
          <path d="M22 22 L26 26 M26 22 L22 26" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "ai-whisperer":
      // Чип
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect x="12" y="12" width="24" height="24" rx="2" stroke={stroke} strokeWidth="2" />
          <rect x="18" y="18" width="12" height="12" stroke={stroke} strokeWidth="1.5" />
          <path d="M16 6 V12 M24 6 V12 M32 6 V12 M16 36 V42 M24 36 V42 M32 36 V42
                   M6 16 H12 M6 24 H12 M6 32 H12 M36 16 H42 M36 24 H42 M36 32 H42"
            stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "merch-hound":
      // Hanger / tag
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M10 36 L24 22 L38 36 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="24" cy="14" r="3" stroke={stroke} strokeWidth="2" />
          <path d="M24 17 V22" stroke={stroke} strokeWidth="2" />
          <path d="M14 40 H34" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "preorder-pioneer":
      // Стрелка вверх в круге
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2" />
          <path d="M24 14 V34 M16 22 L24 14 L32 22" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "rookie":
      // Шеврон
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M8 14 L24 26 L40 14 L40 22 L24 34 L8 22 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "garage-started":
      // Гараж / дом
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M8 22 L24 8 L40 22 V40 H8 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <rect x="16" y="26" width="16" height="14" stroke={stroke} strokeWidth="2" />
          <path d="M16 32 H32" stroke={stroke} strokeWidth="1.6" />
        </svg>
      );
    case "voter":
      // Галка в щите
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M24 6 L40 12 V24 C40 33 32 40 24 42 C16 40 8 33 8 24 V12 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 24 L22 30 L34 18" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "stream-squad":
      // Play в восьмиугольнике
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M16 6 H32 L42 16 V32 L32 42 H16 L6 32 V16 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 16 L34 24 L20 32 Z" fill={stroke} />
        </svg>
      );
    case "track-day":
      // Флаг
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M10 6 V42" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M10 8 H40 L34 16 L40 24 H10 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 12 H22 V20 H10 M22 8 V12 M28 16 V24" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "night-ride":
      // Луна + звезда
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M30 8 A16 16 0 1 0 40 30 A12 12 0 0 1 30 8 Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 10 L13 13 L16 14 L13 15 L12 18 L11 15 L8 14 L11 13 Z" fill={stroke} />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="16" stroke={stroke} strokeWidth="2" />
          <path d="M24 14 V24 L32 28" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}
