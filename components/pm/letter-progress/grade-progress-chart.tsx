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
import type { GroupSummary } from "@/lib/pm/types";

interface Props {
  groups: GroupSummary[];
}

const GRADE_COLORS: Record<string, string> = {
  "ECD": "#ec4899",
  "Grade R": "#3b82f6",
  "Grade 1": "#22c55e",
  "Grade 2": "#8b5cf6",
  "Grade 3": "#f97316",
};

export function GradeProgressChart({ groups }: Props) {
  const letterGroups = groups.filter((g) => g.phase === "letters" && g.grade);

  // Average progress by grade
  const gradeMap = new Map<string, { total: number; count: number }>();
  for (const g of letterGroups) {
    const entry = gradeMap.get(g.grade) || { total: 0, count: 0 };
    entry.total += g.progress_pct;
    entry.count += 1;
    gradeMap.set(g.grade, entry);
  }

  const data = Array.from(gradeMap.entries())
    .map(([grade, { total, count }]) => ({
      grade,
      avg_progress: Math.round(total / count),
      groups: count,
    }))
    .sort((a, b) => {
      const order = ["ECD", "Grade R", "Grade 1", "Grade 2", "Grade 3"];
      return order.indexOf(a.grade) - order.indexOf(b.grade);
    });

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">Average Progress by Grade</p>
        <p className="text-xs text-slate-500">Mean curriculum progress for letter-phase groups</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
          No grade data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="grade"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              label={{ value: "%", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
              formatter={(value, _name, item) => [
                `${value}% (${(item.payload as { groups: number }).groups} groups)`,
                "Avg Progress",
              ]}
            />
            <Bar dataKey="avg_progress" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
