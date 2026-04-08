"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { FlaggedEARow } from "@/lib/pm/types";

interface ComplianceChecksProps {
  compliance: Record<string, { yes: number; no: number; not_observed: number }>;
  flaggedEAs: FlaggedEARow[];
}

const FIELD_LABELS: Record<string, string> = {
  grouping_correct: "Grouping Correct",
  letter_tracker_correct: "Letter Tracker Correct",
  teaching_correct_letters: "Teaching Correct Letters",
  comment_section_usage: "Comment Section Usage",
  mastery_before_blending: "Mastery Before Blending",
};

const STATUS_COLORS = { yes: "#22c55e", no: "#ef4444", not_observed: "#94a3b8" };

export function ComplianceChecks({ compliance, flaggedEAs }: ComplianceChecksProps) {
  const fields = Object.keys(FIELD_LABELS);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Compliance Checks</h2>

      {fields.map((field) => {
        const counts = compliance[field];
        if (!counts) return null;

        const total = counts.yes + counts.no + counts.not_observed;
        if (total === 0) return null;

        const pieData = [
          { name: "Yes", value: counts.yes },
          { name: "No", value: counts.no },
          { name: "Not Observed", value: counts.not_observed },
        ].filter((d) => d.value > 0);

        const flaggedForField = flaggedEAs.filter((ea) => ea.issue === field);
        const yesRate = total > 0 ? Math.round((counts.yes / total) * 100) : 0;

        return (
          <div key={field} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-800">{FIELD_LABELS[field]}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                yesRate >= 90 ? "bg-green-50 text-green-700"
                  : yesRate >= 70 ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}>
                {yesRate}% compliant
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-center">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={
                          entry.name === "Yes" ? STATUS_COLORS.yes
                          : entry.name === "No" ? STATUS_COLORS.no
                          : STATUS_COLORS.not_observed
                        } />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-2">
                {flaggedForField.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-green-600">
                    All EAs compliant (most recent visit = Yes)
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-amber-600 font-semibold mb-2">
                      {flaggedForField.length} EA(s) flagged — most recent visit was No
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-1.5 px-2 font-semibold text-slate-600">EA</th>
                            <th className="text-left py-1.5 px-2 font-semibold text-slate-600">School</th>
                            <th className="text-left py-1.5 px-2 font-semibold text-slate-600">Mentor</th>
                            <th className="text-left py-1.5 px-2 font-semibold text-slate-600">Visit Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flaggedForField.map((ea, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-1.5 px-2 text-slate-800">{ea.ea_name}</td>
                              <td className="py-1.5 px-2 text-slate-600">{ea.school}</td>
                              <td className="py-1.5 px-2 text-slate-600">{ea.mentor}</td>
                              <td className="py-1.5 px-2 text-slate-500">{ea.visit_date || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
