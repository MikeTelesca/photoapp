"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface RevenuePoint {
  month: string;      // "Mar 2026"
  revenue: number;    // dollars
  cost: number;       // dollars
  profit: number;     // dollars
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (!data.length) {
    return (
      <div className="text-center text-graphite-400 dark:text-graphite-500 py-12 text-sm">
        No revenue data yet. Approve some jobs and set your rates in settings.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
          <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: 11 }} />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(17,24,39,0.95)",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              color: "#fff",
            }}
            formatter={(value) => `$${Number(value ?? 0).toFixed(2)}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Revenue"
          />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="API Cost"
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Profit"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
