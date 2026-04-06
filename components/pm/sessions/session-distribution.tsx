"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SessionDistributionBucket } from "@/lib/pm/types";

interface Props {
  data: SessionDistributionBucket[];
}

function bucketColor(range: string): string {
  switch (range) {
    case "0":
      return "#ef4444"; // red
    case "1":
      return "#f59e0b"; // amber
    case "2":
      return "#f59e0b";
    case "3":
      return "#22c55e"; // green
    case "4":
      return "#22c55e";
    case "5+":
      return "#16a34a"; // dark green
    default:
      return "#94a3b8";
  }
}

export function SessionDistribution({ data }: Props) {
  const chartData = data.map((d) => ({
    range: `${d.range} sess/day`,
    ea_count: d.ea_count,
    rawRange: d.range,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">EA Session Distribution</p>
        <p className="text-xs text-slate-500">Avg sessions per day worked</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
          No distribution data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              label={{ value: "EAs", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
              formatter={(value) => [`${value} EAs`, "Count"]}
            />
            <Bar dataKey="ea_count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={bucketColor(entry.rawRange)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
