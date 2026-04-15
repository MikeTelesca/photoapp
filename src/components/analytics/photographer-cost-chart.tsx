"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: Array<{ name: string; cost: number; jobs: number }>;
}

export function PhotographerCostChart({ data }: Props) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#71717A" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#71717A"
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #E4E4E7",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(v) => (typeof v === "number" ? `$${v.toFixed(2)}` : v)}
          />
          <Bar dataKey="cost" fill="#0891B2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
