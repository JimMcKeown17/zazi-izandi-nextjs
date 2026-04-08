"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from "recharts";

interface QualityRatingsProps {
  ratings: Record<string, Record<string, number>>;
}

const FIELD_LABELS: Record<string, string> = {
  session_quality: "Session Quality",
  teacher_relationship: "EA-Teacher Relationship",
};

const RATING_ORDER = ["Excellent", "Good", "Average", "Poor", "Did not observe"];

const RATING_COLORS: Record<string, string> = {
  Excellent: "#22c55e", Good: "#2c5aa0", Average: "#f59e0b", Poor: "#ef4444", "Did not observe": "#cbd5e1",
};

export function QualityRatings({ ratings }: QualityRatingsProps) {
  const fields = Object.keys(FIELD_LABELS);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {fields.map((field) => {
        const counts = ratings[field];
        if (!counts) return null;

        const chartData = RATING_ORDER
          .filter((r) => (counts[r] || 0) > 0)
          .map((rating) => ({ rating, count: counts[rating] || 0 }));

        if (chartData.length === 0) return null;

        return (
          <div key={field} className="bg-white rounded-lg shadow-sm p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-800">{FIELD_LABELS[field]}</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="rating" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.rating} fill={RATING_COLORS[entry.rating] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
