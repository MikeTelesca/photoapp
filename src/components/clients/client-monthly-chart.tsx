"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  data: Array<{ month: string; jobs: number; photos: number }>;
}

export function ClientMonthlyChart({ data }: Props) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" className="dark:opacity-20" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#71717A" />
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
          <Bar dataKey="jobs" fill="#0891B2" name="Jobs" radius={[4, 4, 0, 0]} />
          <Bar dataKey="photos" fill="#64748B" name="Photos" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
