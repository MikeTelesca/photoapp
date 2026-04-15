"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: Array<{ date: string; signups: number }>;
}

export function SignupsChart({ data }: Props) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" className="dark:opacity-20" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#71717A" />
          <YAxis tick={{ fontSize: 11 }} stroke="#71717A" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #E4E4E7",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="signups"
            stroke="#0891B2"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="Signups"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
