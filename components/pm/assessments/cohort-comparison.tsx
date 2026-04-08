"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AssessmentCohortRow } from "@/lib/pm/types";

interface CohortComparisonProps {
  data: AssessmentCohortRow[];
}

const COHORT_COLORS: Record<string, string> = {
  treatment: "#2c5aa0",
  control: "#94a3b8",
  sef: "#ffd641",
};

const COHORT_LABELS: Record<string, string> = {
  treatment: "Treatment",
  control: "Control",
  sef: "SEF",
};

export function CohortComparison({ data }: CohortComparisonProps) {
  const metrics = [
    { key: "avg_lcpm", label: "Avg Letters Correct" },
    { key: "pct_zero", label: "% Zero Letters" },
    { key: "pct_at_benchmark", label: "% At Benchmark" },
  ] as const;

  const chartData = metrics.map((m) => {
    const row: Record<string, string | number> = { metric: m.label };
    for (const cohort of data) {
      row[cohort.cohort] = cohort[m.key];
    }
    return row;
  });

  const cohorts = data.map((c) => c.cohort);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">Treatment vs Control</p>
        <p className="text-xs text-slate-500">
          {data.map((c) => `${COHORT_LABELS[c.cohort] || c.cohort}: ${c.count.toLocaleString()} children`).join(" · ")}
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
          No cohort data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {cohorts.map((cohort) => (
              <Bar
                key={cohort}
                dataKey={cohort}
                name={COHORT_LABELS[cohort] || cohort}
                fill={COHORT_COLORS[cohort] || "#6b7280"}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
