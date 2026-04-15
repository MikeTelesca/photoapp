"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

interface Point {
  date: string;
  cost?: number;
  projected?: number;
}

export function ForecastChart({ data }: { data: Point[] }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(d) => d.slice(5)}
            stroke="#71717A"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
            stroke="#71717A"
          />
          <Tooltip
            formatter={(v) => (typeof v === "number" ? `$${v.toFixed(2)}` : v)}
            contentStyle={{
              background: "#fff",
              border: "1px solid #E4E4E7",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <ReferenceLine
            x={today}
            stroke="#06b6d4"
            strokeDasharray="4 4"
            label={{ value: "Today", fontSize: 10, fill: "#06b6d4" }}
          />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Actual"
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#a78bfa"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Forecast"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
