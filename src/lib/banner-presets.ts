// Пресеты фона для баннеров главной (карусель /club).
// Хранятся в БД в поле image_url как `preset:<id>`. Если префикса нет — это обычный URL картинки.

export type BannerPreset = {
  id: string;
  label: string;
  // CSS gradient — рисуем как background.
  gradient: string;
  // Цветной кружок для превью в админке.
  swatch: string;
};

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: "ember",
    label: "Ember",
    gradient:
      "radial-gradient(120% 80% at 80% 20%, #ff7a3d 0%, #c83d2e 35%, #4a0f1a 75%, #1a0508 100%)",
    swatch: "linear-gradient(135deg, #ff7a3d, #4a0f1a)",
  },
  {
    id: "steel",
    label: "Steel",
    gradient:
      "radial-gradient(120% 80% at 20% 20%, #4a90e2 0%, #1e3a6e 40%, #0a1428 80%, #050a18 100%)",
    swatch: "linear-gradient(135deg, #4a90e2, #0a1428)",
  },
  {
    id: "moss",
    label: "Moss",
    gradient:
      "radial-gradient(120% 80% at 70% 30%, #5ec27a 0%, #2d6b3d 40%, #0f2818 80%, #050d08 100%)",
    swatch: "linear-gradient(135deg, #5ec27a, #0f2818)",
  },
  {
    id: "violet",
    label: "Violet",
    gradient:
      "radial-gradient(120% 80% at 30% 70%, #a87bff 0%, #5a2db5 40%, #1f0a3d 80%, #0a0418 100%)",
    swatch: "linear-gradient(135deg, #a87bff, #1f0a3d)",
  },
];

const PRESET_BY_ID = new Map(BANNER_PRESETS.map((p) => [p.id, p]));

export function getBannerPreset(value: string | null | undefined): BannerPreset | null {
  if (!value || !value.startsWith("preset:")) return null;
  return PRESET_BY_ID.get(value.slice("preset:".length)) ?? null;
}

export function isBannerPreset(value: string | null | undefined): boolean {
  return !!getBannerPreset(value);
}

/** Стиль фона для div-карточки баннера. */
export function bannerBackgroundStyle(imageUrl: string | null | undefined): React.CSSProperties {
  if (!imageUrl) return {};
  const preset = getBannerPreset(imageUrl);
  if (preset) {
    return { backgroundImage: preset.gradient };
  }
  return {
    backgroundImage: `url(${JSON.stringify(imageUrl)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
