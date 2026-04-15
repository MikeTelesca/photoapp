"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Point { address: string; perPhoto: number; }

export function CompletionTimeChart({ data, median }: { data: Point[]; median: number }) {
  // Truncate addresses for display
  const chartData = data.slice().reverse().map(d => ({
    name: d.address.split(",")[0].slice(0, 18),
    perPhoto: d.perPhoto,
  }));

  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 5, right: 12, bottom: 30, left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}s`} />
          <Tooltip formatter={(v: any) => typeof v === "number" ? `${v}s/photo` : v} />
          {median > 0 && (
            <ReferenceLine y={median} stroke="#06b6d4" strokeDasharray="4 4" label={{ value: `median ${median}s`, fontSize: 10, fill: "#06b6d4" }} />
          )}
          <Bar dataKey="perPhoto" fill="#a78bfa" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
