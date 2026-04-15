"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  data: Array<{ date: string; jobs: number; cost: number }>;
}

export function DailyChart({ data }: Props) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#71717A" />
          <YAxis tick={{ fontSize: 11 }} stroke="#71717A" />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #E4E4E7",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line
            type="monotone"
            dataKey="jobs"
            stroke="#0891B2"
            strokeWidth={2}
            dot={false}
            name="Jobs"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
