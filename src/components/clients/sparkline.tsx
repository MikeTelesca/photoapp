interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Tiny inline SVG sparkline. Draws a polyline scaled so that the max value
 * fills the available height. If all values are zero, renders a flat baseline.
 */
export function Sparkline({ values, width = 60, height = 20, className }: SparklineProps) {
  const n = values.length;
  if (n === 0) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }

  const max = Math.max(...values, 0);
  const pad = 1;
  const innerH = Math.max(1, height - pad * 2);
  const stepX = n > 1 ? (width - pad * 2) / (n - 1) : 0;

  const points = values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = max > 0 ? pad + innerH - (v / max) * innerH : height - pad;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const total = values.reduce((s, v) => s + v, 0);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-label={`${total} photos in the last ${n} days`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
