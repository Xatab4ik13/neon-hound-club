// Медальон-значок. Структура: гекс-рамка с градиентом редкости → внутренний
// рим → шестигранная подложка с штриховкой → центральный глиф.
// Всё внутри одного SVG — дёшево для DOM. Анимации (вращение ободка, парение,
// блик) — CSS transform/opacity, GPU-friendly.

type Props = {
  id: string;
  /** Основной цвет редкости. */
  color: string;
  /** Мягкий цвет для свечения. */
  soft?: string;
  size?: number;
  /** Если true — значок «получен», добавляем idle-анимации и блик на hover. */
  animated?: boolean;
  /** «Тяжёлая» редкость (legendary / mythic) — добавляем вращающийся ободок. */
  premium?: boolean;
};

// Шестигранник по центру (24,24), радиус 22 — основа всех значков.
const HEX = "M24 2 L43 13 L43 35 L24 46 L5 35 L5 13 Z";
const HEX_INNER = "M24 6 L39.6 15 L39.6 33 L24 42 L8.4 33 L8.4 15 Z";

export function BadgeIcon({
  id,
  color,
  soft,
  size = 44,
  animated = false,
  premium = false,
}: Props) {
  const gid = `bg-${id}`;
  const glow = soft ?? color;
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Вращающийся ободок для premium-редкостей (CSS-анимация — дёшево). */}
      {animated && premium && (
        <span
          aria-hidden
          className="badge-spin pointer-events-none absolute inset-[-3px] rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${color}, transparent 40%, ${color} 70%, transparent)`,
            animation: "badge-spin 8s linear infinite",
            filter: "blur(2px)",
            opacity: 0.55,
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        className={animated ? "badge-float relative" : "relative"}
        style={animated ? { animation: "badge-float 4.5s ease-in-out infinite" } : undefined}
      >
        <defs>
          <linearGradient id={`${gid}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="50%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          <radialGradient id={`${gid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
            <stop offset="70%"  stopColor={color} stopOpacity="0" />
          </radialGradient>
          <pattern id={`${gid}-hatch`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke={color} strokeWidth="0.4" opacity="0.18" />
          </pattern>
        </defs>

        {/* Внешний rim */}
        <path d={HEX} fill={`url(#${gid}-rim)`} />
        {/* Тёмная подложка */}
        <path d={HEX_INNER} fill={`url(#${gid}-fill)`} />
        {/* Внутренняя штриховка */}
        <path d={HEX_INNER} fill={`url(#${gid}-hatch)`} />
        {/* Радиальное свечение */}
        <path d={HEX_INNER} fill={`url(#${gid}-glow)`} />
        {/* Тонкая внутренняя линия */}
        <path d={HEX_INNER} fill="none" stroke={color} strokeWidth="0.6" opacity="0.5" />

        {/* Центральный глиф */}
        <g transform="translate(0,0)">
          <Glyph id={id} color={color} glow={glow} />
        </g>

        {/* Угловые «болты» */}
        <circle cx="24" cy="3.5" r="0.9" fill={color} />
        <circle cx="24" cy="44.5" r="0.9" fill={color} />
      </svg>
    </span>
  );
}

// ── Глифы ─────────────────────────────────────────────────────────────────
// Все глифы рисуются в boundindg-box ~ (10..38, 10..38), чтобы лежать внутри гекса.

function Glyph({ id, color, glow }: { id: string; color: string; glow: string }) {
  const c = color;
  switch (id) {
    case "founder-s01":
      // Череп в короне — мифик
      return (
        <g>
          {/* корона */}
          <path d="M16 14 L19 18 L24 12 L29 18 L32 14 L31 21 L17 21 Z"
            fill={c} opacity="0.9" />
          <circle cx="24" cy="11" r="1.2" fill={c} />
          {/* череп */}
          <path d="M17 23 Q17 19 24 19 Q31 19 31 23 L31 30 L28 33 L27 36 L21 36 L20 33 L17 30 Z"
            fill="#0a0a0a" stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="20.5" cy="27" r="1.6" fill={c} />
          <circle cx="27.5" cy="27" r="1.6" fill={c} />
          <path d="M22 32 L24 30 L26 32" stroke={c} strokeWidth="1" strokeLinecap="round" fill="none" />
          {/* зубы */}
          <path d="M20 36 L20.5 38 L22 36 L23 38 L24 36 L25 38 L26 36 L27 38 L28 36"
            stroke={c} strokeWidth="0.9" fill="none" />
        </g>
      );
    case "platinum-s01":
    case "gold-s01":
    case "silver-s01": {
      // Бриллиант с гранями
      return (
        <g>
          <path d="M14 20 L24 12 L34 20 L24 38 Z" fill="#0a0a0a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M14 20 L34 20" stroke={c} strokeWidth="1.1" />
          <path d="M19 20 L24 38 L29 20" stroke={c} strokeWidth="1" opacity="0.85" />
          <path d="M19 20 L24 12 L29 20" stroke={c} strokeWidth="0.8" opacity="0.6" />
          {/* Внутренний блик */}
          <path d="M21 22 L24 16 L27 22 L24 28 Z" fill={c} opacity="0.25" />
        </g>
      );
    }
    case "first-win":
      // Кубок 1st
      return (
        <g>
          <path d="M16 12 H32 V18 A8 8 0 0 1 16 18 Z" fill="#0a0a0a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M16 14 H12 V16 A4 4 0 0 0 16 20 M32 14 H36 V16 A4 4 0 0 1 32 20" stroke={c} strokeWidth="1.3" fill="none" />
          <path d="M20 26 H28 V32 H30 V36 H18 V32 H20 Z" fill={c} opacity="0.85" />
          <text x="24" y="19" textAnchor="middle" fontSize="6" fontWeight="900" fill={c} fontFamily="monospace">1</text>
        </g>
      );
    case "hells-howl":
      // Воющий волк (стилизованный профиль)
      return (
        <g>
          <path d="M14 16 L19 14 L21 18 L26 14 L28 16 L34 17 L33 25 L36 30 L31 32 L29 36 L25 33 L21 36 L18 32 L14 30 L16 24 Z"
            fill="#0a0a0a" stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="22" cy="24" r="1.3" fill={c} />
          <circle cx="28" cy="24" r="1.3" fill={c} />
          <path d="M23 29 L25 30 L27 29" stroke={c} strokeWidth="1.1" fill="none" strokeLinecap="round" />
          {/* молнии-уши */}
          <path d="M16 14 L18 10 L17 13 L19 12" stroke={c} strokeWidth="0.9" fill={c} opacity="0.8" />
          <path d="M32 14 L30 10 L31 13 L29 12" stroke={c} strokeWidth="0.9" fill={c} opacity="0.8" />
        </g>
      );
    case "ticket-hunter":
      // Билет с перфорацией
      return (
        <g>
          <path d="M11 18 V21 A1.5 1.5 0 0 1 11 24 V27 A1.5 1.5 0 0 1 11 30 H37 V27 A1.5 1.5 0 0 1 37 24 V21 A1.5 1.5 0 0 1 37 18 Z"
            fill="#0a0a0a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M18 18 V30 M30 18 V30" stroke={c} strokeWidth="1" strokeDasharray="1.5 2" />
          <text x="24" y="27.5" textAnchor="middle" fontSize="7" fontWeight="900" fill={c} fontFamily="monospace">50</text>
        </g>
      );
    case "ai-whisperer":
      // Чип с контактами
      return (
        <g>
          <rect x="15" y="15" width="18" height="18" rx="1.5" fill="#0a0a0a" stroke={c} strokeWidth="1.3" />
          <rect x="19" y="19" width="10" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.15" />
          <circle cx="24" cy="24" r="1.2" fill={c} />
          {[18, 24, 30].map((x) => (
            <g key={x}>
              <path d={`M${x} 11 V15`} stroke={c} strokeWidth="1.2" strokeLinecap="round" />
              <path d={`M${x} 33 V37`} stroke={c} strokeWidth="1.2" strokeLinecap="round" />
              <path d={`M11 ${x} H15`} stroke={c} strokeWidth="1.2" strokeLinecap="round" />
              <path d={`M33 ${x} H37`} stroke={c} strokeWidth="1.2" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    case "merch-hound":
      // Вешалка с тегом
      return (
        <g>
          <circle cx="24" cy="14" r="2.2" stroke={c} strokeWidth="1.3" fill="#0a0a0a" />
          <path d="M24 16.2 V20" stroke={c} strokeWidth="1.3" />
          <path d="M14 32 L24 20 L34 32 Z" fill="#0a0a0a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M16 36 H32" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M21 26 L27 26" stroke={c} strokeWidth="1" opacity="0.6" />
        </g>
      );
    case "preorder-pioneer":
      // Стрелка вверх с импульсом
      return (
        <g>
          <circle cx="24" cy="24" r="11" fill="#0a0a0a" stroke={c} strokeWidth="1.4" />
          <path d="M24 16 V32 M18 22 L24 16 L30 22" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="24" cy="24" r="14" stroke={c} strokeWidth="0.6" opacity="0.4" fill="none" strokeDasharray="2 2" />
        </g>
      );
    case "rookie":
      // Двойной шеврон
      return (
        <g>
          <path d="M14 18 L24 26 L34 18 L34 22 L24 30 L14 22 Z" fill={c} opacity="0.85" />
          <path d="M14 26 L24 34 L34 26 L34 30 L24 38 L14 30 Z" fill={c} opacity="0.55" />
        </g>
      );
    case "garage-started":
      // Гараж с воротами
      return (
        <g>
          <path d="M12 24 L24 14 L36 24 V36 H12 Z" fill="#0a0a0a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="17" y="27" width="14" height="9" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.1" />
          <path d="M17 30 H31 M17 33 H31" stroke={c} strokeWidth="0.9" opacity="0.7" />
          <path d="M22 14 L22 11 H26 V14" stroke={c} strokeWidth="1" fill="none" />
        </g>
      );
    case "voter":
      // Галка в щите
      return (
        <g>
          <path d="M24 12 L34 16 V24 C34 30 29 35 24 36 C19 35 14 30 14 24 V16 Z"
            fill="#0a0a0a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M19 24 L23 28 L29 21" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case "stream-squad":
      // Play в октагоне
      return (
        <g>
          <path d="M18 12 H30 L36 18 V30 L30 36 H18 L12 30 V18 Z" fill="#0a0a0a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M21 18 L31 24 L21 30 Z" fill={c} />
          <circle cx="24" cy="11" r="0.9" fill={c}>
            <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    case "track-day":
      // Гоночный флаг
      return (
        <g>
          <path d="M14 12 V37" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14 13 H34 L30 19 L34 25 H14 Z" fill="#0a0a0a" stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
          {/* шахматка */}
          <rect x="14" y="13" width="4" height="3" fill={c} />
          <rect x="22" y="13" width="4" height="3" fill={c} />
          <rect x="18" y="16" width="4" height="3" fill={c} />
          <rect x="26" y="16" width="4" height="3" fill={c} />
          <rect x="14" y="19" width="4" height="3" fill={c} />
          <rect x="22" y="19" width="4" height="3" fill={c} />
          <rect x="18" y="22" width="4" height="3" fill={c} />
          <rect x="26" y="22" width="4" height="3" fill={c} />
        </g>
      );
    case "first-raffle":
      // Билет №001 с подковой удачи
      return (
        <g>
          {/* подкова на заднем плане */}
          <path d="M16 14 C16 24 16 30 20 34 M32 14 C32 24 32 30 28 34"
            stroke={c} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55" />
          <circle cx="20" cy="34" r="1" fill={c} opacity="0.6" />
          <circle cx="28" cy="34" r="1" fill={c} opacity="0.6" />
          {/* билет */}
          <path d="M12 20 V23 A1.2 1.2 0 0 1 12 25.4 V28 H36 V25.4 A1.2 1.2 0 0 1 36 23 V20 Z"
            fill="#0a0a0a" stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
          <text x="24" y="26" textAnchor="middle" fontSize="6" fontWeight="900" fill={c} fontFamily="monospace">001</text>
        </g>
      );
    case "rank-rookie":
      // Один шеврон вверх
      return (
        <g>
          <path d="M14 26 L24 16 L34 26 L34 30 L24 20 L14 30 Z" fill={c} opacity="0.9" />
          <path d="M19 32 L24 27 L29 32" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case "rank-pit-crew":
      // Скрещённые гаечные ключи
      return (
        <g transform="rotate(45 24 24)">
          {/* ключ 1 */}
          <path d="M12 22 H28 V26 H12 Z M28 20 A4 4 0 1 1 28 28 Z" fill="#0a0a0a" stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="32" cy="24" r="2" fill={c} opacity="0.3" />
          {/* ключ 2 (перпендикулярный) */}
          <g transform="rotate(90 24 24)">
            <path d="M12 22 H28 V26 H12 Z M28 20 A4 4 0 1 1 28 28 Z" fill="#0a0a0a" stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
            <circle cx="32" cy="24" r="2" fill={c} opacity="0.3" />
          </g>
        </g>
      );
    case "rank-road-captain":
      // Руль / штурвал
      return (
        <g>
          <circle cx="24" cy="24" r="10" fill="#0a0a0a" stroke={c} strokeWidth="1.5" />
          <circle cx="24" cy="24" r="3" fill={c} opacity="0.4" stroke={c} strokeWidth="1" />
          {/* спицы */}
          <path d="M24 14 V21 M24 27 V34 M14 24 H21 M27 24 H34" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
          {/* верхние хваты */}
          <path d="M16 18 L19 21 M32 18 L29 21 M16 30 L19 27 M32 30 L29 27" stroke={c} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case "rank-alpha-hound":
      // Лапа волка с когтями
      return (
        <g>
          {/* подушка */}
          <path d="M18 26 Q24 22 30 26 Q32 32 28 36 H20 Q16 32 18 26 Z"
            fill="#0a0a0a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          {/* пальцы */}
          <ellipse cx="17" cy="20" rx="2.2" ry="3" fill="#0a0a0a" stroke={c} strokeWidth="1.2" />
          <ellipse cx="22" cy="16" rx="2.2" ry="3" fill="#0a0a0a" stroke={c} strokeWidth="1.2" />
          <ellipse cx="27" cy="16" rx="2.2" ry="3" fill="#0a0a0a" stroke={c} strokeWidth="1.2" />
          <ellipse cx="32" cy="20" rx="2.2" ry="3" fill="#0a0a0a" stroke={c} strokeWidth="1.2" />
          {/* когти */}
          <path d="M16 17 L15 14 M22 13 L22 10 M27 13 L27 10 M33 17 L34 14"
            stroke={c} strokeWidth="1.3" strokeLinecap="round" />
        </g>
      );
    case "rank-hell-legend":
      // Пламенная корона
      return (
        <g>
          {/* пламя/корона */}
          <path d="M13 30 L13 22 L17 26 L20 16 L24 24 L28 16 L31 26 L35 22 L35 30 Z"
            fill={c} opacity="0.25" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          {/* внутренние огоньки */}
          <path d="M20 26 Q22 22 24 26 Q26 22 28 26" stroke={c} strokeWidth="1.2" fill="none" />
          {/* база */}
          <rect x="13" y="32" width="22" height="3" fill={c} opacity="0.85" />
          <rect x="13" y="36" width="22" height="1" fill={c} opacity="0.5" />
          {/* камни */}
          <circle cx="18" cy="33.5" r="0.9" fill="#0a0a0a" />
          <circle cx="24" cy="33.5" r="1.1" fill="#0a0a0a" />
          <circle cx="30" cy="33.5" r="0.9" fill="#0a0a0a" />
        </g>
      );
    case "rank-vip":
      // Платиновая звезда с лавром
      return (
        <g>
          {/* лавровые ветки */}
          <path d="M12 30 Q14 22 18 18" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M36 30 Q34 22 30 18" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M13 28 L15 27 M13 25 L15 24 M14 22 L16 21" stroke={c} strokeWidth="1" strokeLinecap="round" opacity="0.85" />
          <path d="M35 28 L33 27 M35 25 L33 24 M34 22 L32 21" stroke={c} strokeWidth="1" strokeLinecap="round" opacity="0.85" />
          {/* звезда */}
          <path d="M24 12 L26.6 19 L34 19.5 L28.3 24 L30.3 31 L24 27 L17.7 31 L19.7 24 L14 19.5 L21.4 19 Z"
            fill="#0a0a0a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M24 16 L25.6 19.8 L29.5 20 L26.5 22.5 L27.5 26 L24 23.8 L20.5 26 L21.5 22.5 L18.5 20 L22.4 19.8 Z"
            fill={c} opacity="0.4" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="24" cy="24" r="9" stroke={c} strokeWidth="1.4" fill="#0a0a0a" />
          <path d="M24 18 V24 L28 26" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </g>
      );
  }
}
