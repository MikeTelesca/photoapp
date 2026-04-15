interface ThumbHoverPreviewProps {
  src: string;
  visible: boolean;
  x: number;
  y: number;
}

export function ThumbHoverPreview({ src, visible, x, y }: ThumbHoverPreviewProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: `${x + 10}px`,
        top: `${y + 10}px`,
        zIndex: 1000,
        pointerEvents: "none",
      }}
      className="rounded-lg shadow-2xl overflow-hidden border border-graphite-200"
    >
      <img
        src={src}
        alt="Hover preview"
        className="w-64 h-auto object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}
