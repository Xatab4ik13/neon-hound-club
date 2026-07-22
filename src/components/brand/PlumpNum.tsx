import {
  PlumpNumber0,
  PlumpNumber1,
  PlumpNumber2,
  PlumpNumber3,
  PlumpNumber4,
  PlumpNumber5,
  PlumpNumber6,
  PlumpNumber7,
  PlumpNumber8,
  PlumpNumber9,
} from "@/components/ui/icons";

const DIGIT_ICONS = [
  PlumpNumber0,
  PlumpNumber1,
  PlumpNumber2,
  PlumpNumber3,
  PlumpNumber4,
  PlumpNumber5,
  PlumpNumber6,
  PlumpNumber7,
  PlumpNumber8,
  PlumpNumber9,
];

type PlumpNumProps = {
  /** Число или готовая строка (может содержать разделители, знак валюты, ":"). */
  value: number | string;
  /** Высота одной цифры в px. По умолчанию 14. */
  size?: number;
  /** Форматировать число с пробелами-разделителями тысяч (ru-RU). */
  format?: boolean;
  /** Дописать суффикс справа обычным шрифтом (например " ₽", " XP"). */
  suffix?: string;
  /** Дописать префикс слева (например "#"). */
  prefix?: string;
  /** Aria-label. По умолчанию — исходное значение. */
  label?: string;
  className?: string;
};

/**
 * Единый рендер цифр в фирменном Plump-стиле.
 * Цифры — SVG-иконки, всё остальное (пробелы, ".", ":", "/", "₽", "%") — текст с baseline-выравниванием.
 */
export function PlumpNum({
  value,
  size = 14,
  format = false,
  suffix,
  prefix,
  label,
  className,
}: PlumpNumProps) {
  let str: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      str = "0";
    } else {
      str = format
        ? new Intl.NumberFormat("ru-RU").format(Math.round(value))
        : String(Math.round(value));
    }
  } else {
    str = value;
  }

  const chars = Array.from(str);
  // Ширина «пробела» между группами тысяч
  const gapWidth = Math.max(2, Math.round(size * 0.22));

  return (
    <span
      className={`inline-flex items-center leading-none align-baseline ${className ?? ""}`}
      aria-label={label ?? `${prefix ?? ""}${str}${suffix ?? ""}`}
      style={{ height: size }}
    >
      {prefix ? (
        <span
          className="mr-0.5 font-mono font-black"
          style={{ fontSize: Math.round(size * 0.7), lineHeight: 1 }}
        >
          {prefix}
        </span>
      ) : null}
      {chars.map((ch, i) => {
        if (ch >= "0" && ch <= "9") {
          const Icon = DIGIT_ICONS[Number(ch)];
          return <Icon key={i} size={size} />;
        }
        if (ch === " " || ch === "\u00A0" || ch === "\u202F") {
          return <span key={i} style={{ width: gapWidth }} />;
        }
        // Остальные символы (":", ".", ",", "/", "-", "%", "₽") — как текст, крупно и жирно
        return (
          <span
            key={i}
            className="font-mono font-black"
            style={{
              fontSize: Math.round(size * 0.72),
              lineHeight: 1,
              paddingLeft: 1,
              paddingRight: 1,
            }}
          >
            {ch}
          </span>
        );
      })}
      {suffix ? (
        <span
          className="ml-1 font-mono font-black"
          style={{ fontSize: Math.round(size * 0.7), lineHeight: 1 }}
        >
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

/** Цена в рублях: 1 490 ₽ в Plump-стиле. */
export function PlumpPrice({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <PlumpNum
      value={value}
      size={size}
      format
      suffix="₽"
      className={className}
      label={`${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ₽`}
    />
  );
}
