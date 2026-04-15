interface DailyBucket {
  date: string;
  cost: number;
}

// Simple linear regression for forecast
export function forecastCost(
  history: DailyBucket[],
  daysAhead = 30
): DailyBucket[] {
  if (history.length < 2) {
    return Array.from({ length: daysAhead }, (_, i) => ({
      date: futureDate(i + 1),
      cost: 0,
    }));
  }

  // Convert dates to numeric X (days from first)
  const firstDate = new Date(history[0].date).getTime();
  const points = history.map((h) => ({
    x: (new Date(h.date).getTime() - firstDate) / 86400000,
    y: h.cost,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const lastX = points[points.length - 1].x;
  return Array.from({ length: daysAhead }, (_, i) => {
    const x = lastX + i + 1;
    const predicted = Math.max(0, slope * x + intercept);
    return {
      date: futureDate(i + 1),
      cost: Math.round(predicted * 100) / 100,
    };
  });
}

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
