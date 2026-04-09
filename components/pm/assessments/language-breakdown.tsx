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
import type { AssessmentLanguageRow } from "@/lib/pm/types";

interface LanguageBreakdownProps {
  data: AssessmentLanguageRow[];
}

export function LanguageBreakdown({ data }: LanguageBreakdownProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">By Language</p>
        <p className="text-xs text-slate-500">Average letters correct</p>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
          No data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="language"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
            />
            <Bar dataKey="avg_lcpm" name="Avg LCPM" fill="#2c5aa0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
