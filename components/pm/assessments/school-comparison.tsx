"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { AssessmentSchoolRow } from "@/lib/pm/types";

interface SchoolComparisonProps {
  data: AssessmentSchoolRow[];
}

const COHORT_FILLS: Record<string, string> = {
  treatment: "#2c5aa0",
  control: "#94a3b8",
  sef: "#ffd641",
};

export function SchoolComparison({ data }: SchoolComparisonProps) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...data].sort((a, b) => b.avg_lcpm - a.avg_lcpm);
  const displayed = showAll ? sorted : sorted.slice(0, 30);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">School Comparison</p>
          <p className="text-xs text-slate-500">Average letters correct by school</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#2c5aa0" }} />
            Treatment
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#94a3b8" }} />
            Control
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ffd641" }} />
            SEF
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
          No school data available
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(300, displayed.length * 24)}>
            <BarChart data={displayed} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="school" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} width={180} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }} formatter={(value) => [typeof value === "number" ? value.toFixed(1) : value, "Avg LCPM"]} />
              <Bar dataKey="avg_lcpm" radius={[0, 4, 4, 0]}>
                {displayed.map((entry, i) => (
                  <Cell key={i} fill={COHORT_FILLS[entry.cohort] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {sorted.length > 30 && (
            <button onClick={() => setShowAll(!showAll)} className="mt-2 text-xs text-primary hover:underline">
              {showAll ? "Show top 30" : `Show all ${sorted.length} schools`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
