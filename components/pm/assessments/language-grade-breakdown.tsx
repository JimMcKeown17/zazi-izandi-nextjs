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
import type { AssessmentsSummaryResponse } from "@/lib/pm/types";

interface LanguageGradeBreakdownProps {
  data: AssessmentsSummaryResponse;
}

export function LanguageGradeBreakdown({ data }: LanguageGradeBreakdownProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* By Language */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-800">By Language</p>
          <p className="text-xs text-slate-500">Average letters correct</p>
        </div>
        {data.by_language.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.by_language} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="language" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="avg_lcpm" name="Avg LCPM" fill="#2c5aa0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* By Grade */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-800">By Grade</p>
          <p className="text-xs text-slate-500">Average letters correct and % zero knowledge</p>
        </div>
        {data.by_grade.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.by_grade} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="avg_lcpm" name="Avg LCPM" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
