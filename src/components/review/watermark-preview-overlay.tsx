"use client";

interface Props {
  text?: string | null;
  position?: string | null;
  size?: number | null;
  opacity?: number | null;
  visible: boolean;
}

const POS_CLASSES: Record<string, string> = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-2 right-2",
  "center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

export function WatermarkPreviewOverlay({ text, position, size, opacity, visible }: Props) {
  if (!visible || !text) return null;

  const posClass = POS_CLASSES[position || "bottom-right"] || POS_CLASSES["bottom-right"];
  const fontSize = `${size || 32}px`;
  const op = opacity ?? 0.7;

  return (
    <div
      className={`absolute ${posClass} pointer-events-none z-10`}
      style={{
        color: "white",
        fontSize,
        fontWeight: 700,
        opacity: op,
        textShadow: "0 0 4px rgba(0,0,0,0.8), 1px 1px 2px rgba(0,0,0,0.6)",
        fontFamily: "sans-serif",
      }}
    >
      {text}
    </div>
  );
}
