"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { ScoreDistributionBucket } from "@/lib/pm/types";

interface ScoreDistributionProps {
  data: ScoreDistributionBucket[];
}

const THRESHOLDS = [
  { value: 0, label: "Zero", color: "#ef4444" },
  { value: 10, label: "Gr R benchmark", color: "#f59e0b" },
  { value: 40, label: "Gr 1 benchmark", color: "#22c55e" },
];

export function ScoreDistribution({ data }: ScoreDistributionProps) {
  const chartData = data.map((d) => ({
    label: `${d.bucket}–${d.bucket + 4}`,
    bucket: d.bucket,
    count: d.count,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">Score Distribution</p>
        <p className="text-xs text-slate-500">Letters correct (LCPM) — all children</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
          No distribution data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
              formatter={(value) => [typeof value === "number" ? value.toLocaleString() : value, "Children"]}
            />
            <Bar dataKey="count" fill="#2c5aa0" radius={[4, 4, 0, 0]} />
            {THRESHOLDS.map((t) => {
              const idx = data.findIndex((d) => d.bucket === t.value);
              if (idx < 0) return null;
              return (
                <ReferenceLine
                  key={t.value}
                  x={chartData[idx]?.label}
                  stroke={t.color}
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: t.label, position: "top", fontSize: 10, fill: t.color }}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
