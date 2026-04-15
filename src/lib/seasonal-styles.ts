export interface SeasonalStyle {
  key: string;
  name: string;
  emoji: string;
  modifier: string;
}

export const SEASONAL_STYLES: SeasonalStyle[] = [
  {
    key: "spring",
    name: "Spring",
    emoji: "🌸",
    modifier: "Bias colors toward fresh spring tones — slightly warmer greens, vibrant flowering plants if visible, soft natural daylight. Avoid heavy yellow casts.",
  },
  {
    key: "summer",
    name: "Summer",
    emoji: "☀️",
    modifier: "Bias toward bright midday summer light, saturated blues in skies, lush greens. Ensure exterior shots have a vibrant warm-bright look without overexposure.",
  },
  {
    key: "autumn",
    name: "Autumn",
    emoji: "🍂",
    modifier: "Bias colors toward warm autumn palette — golden hour tones, slight amber warmth, rich oranges and reds in any visible foliage. Soft afternoon light.",
  },
  {
    key: "winter",
    name: "Winter",
    emoji: "❄️",
    modifier: "Bias toward cool winter light — slightly desaturated, brighter exposures to compensate for low light, clean whites, blue-tinted highlights. Snow if visible should look natural.",
  },
  {
    key: "twilight",
    name: "Twilight",
    emoji: "🌆",
    modifier: "Apply twilight mood to exterior shots only — deep blue hour sky, warm interior lights glowing through windows, cinematic contrast between cool and warm tones.",
  },
];

export function getSeasonalModifier(key: string | null | undefined): string {
  if (!key) return "";
  const style = SEASONAL_STYLES.find(s => s.key === key);
  return style?.modifier || "";
}
