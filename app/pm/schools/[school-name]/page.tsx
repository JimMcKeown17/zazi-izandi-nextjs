import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Users, Baby, Layers, Activity } from "lucide-react";
import { getSchoolDetail } from "@/lib/pm/api";
import { getDosageLevel } from "@/lib/pm/constants";
import { SchoolDetailHeader } from "@/components/pm/schools/school-detail-header";
import { DosageBadge } from "@/components/pm/shared/dosage-badge";

interface Props {
  params: Promise<{ "school-name": string }>;
}

export default async function SchoolDetailPage({ params }: Props) {
  const { "school-name": schoolSlug } = await params;
  const school = await getSchoolDetail(schoolSlug);

  // Compute bar chart max for Recent Activity
  const maxSessions =
    school.recent_sessions.length > 0
      ? Math.max(...school.recent_sessions.map((d) => d.session_count))
      : 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/pm" className="hover:text-primary transition-colors">
          Overview
        </Link>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <Link href="/pm/schools" className="hover:text-primary transition-colors">
          Schools
        </Link>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-slate-800 font-medium truncate">{school.school_name}</span>
      </nav>

      {/* School KPI header */}
      <SchoolDetailHeader school={school} />

      {/* Education Assistants */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Education Assistants</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {school.eas.map((ea) => (
            <div
              key={ea.name}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3"
            >
              {/* EA name + dosage badge */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{ea.name}</p>
                <DosageBadge value={ea.avg_sessions_per_group_per_week} showLabel />
              </div>

              {/* 3-column stats grid */}
              <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
                <div className="flex flex-col items-center gap-1">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">
                    {ea.groups_count}
                  </span>
                  <span className="text-xs text-slate-400">Groups</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Baby className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">
                    {ea.children_count}
                  </span>
                  <span className="text-xs text-slate-400">Children</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">
                    {ea.sessions_this_week}
                  </span>
                  <span className="text-xs text-slate-400">Sess/wk</span>
                </div>
              </div>

              {/* Flags badge */}
              {ea.flags_count > 0 && (
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">
                    {ea.flags_count} flag{ea.flags_count !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Active Flags table — only if flags exist */}
      {school.flags.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Active Flags</h2>
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600 uppercase tracking-wide text-xs">
                      Flag
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600 uppercase tracking-wide text-xs">
                      Entity
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600 uppercase tracking-wide text-xs">
                      Detail
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600 uppercase tracking-wide text-xs">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {school.flags.map((flag, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-800 capitalize">
                        {flag.flag_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{flag.entity}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{flag.detail}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold capitalize">
                          {flag.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Recent Activity bar chart */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          {school.recent_sessions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No recent session data.</p>
          ) : (
            <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
              {school.recent_sessions.map((day) => {
                const heightPct = maxSessions > 0 ? (day.session_count / maxSessions) * 100 : 0;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 flex-1 min-w-[36px]">
                    {/* Count label above bar */}
                    <span className="text-xs font-semibold text-slate-600 tabular-nums">
                      {day.session_count}
                    </span>
                    {/* Bar */}
                    <div
                      className="w-full rounded-t bg-primary/80"
                      style={{ height: `${Math.max(heightPct, 4)}px`, minHeight: 4 }}
                    />
                    {/* Date label below bar — rotated */}
                    <span
                      className="text-xs text-slate-400 whitespace-nowrap"
                      style={{
                        transform: "rotate(-45deg)",
                        transformOrigin: "top left",
                        display: "block",
                        marginTop: 4,
                        fontSize: "10px",
                      }}
                    >
                      {day.date}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
