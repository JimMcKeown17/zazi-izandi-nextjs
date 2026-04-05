"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { DosageBucket } from "@/lib/pm/types";

interface DosageDistributionProps {
  data: DosageBucket[];
}

function getBucketColor(range: string): string {
  // 0-1 and 1-2 = red, 2-3 = amber, 3-4 and 4+ = green
  if (range === "0-1" || range === "1-2") return "#e74c3c";
  if (range === "2-3") return "#f59e0b";
  return "#22c55e";
}

export function DosageDistribution({ data }: DosageDistributionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">Dosage Distribution</p>
        <p className="text-xs text-slate-500">sessions / group / week</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="range"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #e2e8f0",
            }}
            formatter={(value) => [value, "Groups"]}
          />
          <Bar dataKey="count" name="Groups" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBucketColor(entry.range)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-slate-400 mt-2 text-center">sessions / group / week</p>
    </div>
  );
}
