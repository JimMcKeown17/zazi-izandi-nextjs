import Link from "next/link";
import { ChevronRight, AlertTriangle, Users, Baby, Layers, Activity, BookOpen } from "lucide-react";
import { getSchoolDetail } from "@/lib/pm/api";
import { getDosageLevel, DOSAGE_COLORS } from "@/lib/pm/constants";
import { KPICard } from "@/components/pm/shared/kpi-card";
import { DosageBadge } from "@/components/pm/shared/dosage-badge";

interface Props {
  params: Promise<{ "school-name": string }>;
}

const FLAG_LABELS: Record<string, string> = {
  same_letter_group: "Same Letter",
  moving_too_fast: "Moving Too Fast",
  ghost_group: "Ghost Group",
  stagnation: "Stagnation",
  curriculum_gaps: "Not Following Order",
};

export default async function SchoolDetailPage({ params }: Props) {
  const { "school-name": schoolSlug } = await params;
  const { data: school, isLive } = await getSchoolDetail(schoolSlug);

  // Derive display name from slug for breadcrumb when school not found
  const displayName = school?.school_name
    ?? schoolSlug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

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
        <span className="text-slate-800 font-medium truncate">{displayName}</span>
      </nav>

      {/* Data unavailable banner */}
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">School data unavailable.</span>{" "}
            The API is currently unreachable. Data below may be empty.
          </div>
        </div>
      )}

      {!school ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
          <p className="text-slate-500 text-lg">
            {isLive
              ? "School not found. It may not be part of the current programme."
              : "Unable to load school data. Please try again later."}
          </p>
        </div>
      ) : (
        <>
          {/* School KPI header */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{school.school_name}</h1>
              <p className="text-sm text-slate-500 capitalize mt-0.5">{school.school_type}</p>
            </div>

            {(() => {
              const dosageLevel = getDosageLevel(school.avg_sessions_per_group_per_week);
              const dosageColors = DOSAGE_COLORS[dosageLevel];
              const dosageBorder =
                dosageLevel === "on_track"
                  ? "border-l-green-500"
                  : dosageLevel === "needs_attention"
                  ? "border-l-yellow-500"
                  : "border-l-red-500";

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <KPICard label="EAs" value={school.ea_count} borderColor="border-l-primary" />
                  <KPICard label="Children" value={school.children_count.toLocaleString()} borderColor="border-l-primary" />
                  <KPICard label="Groups" value={school.groups_count} borderColor="border-l-primary" />
                  <KPICard label="Total Sessions" value={school.total_sessions.toLocaleString()} borderColor="border-l-primary" />
                  <KPICard
                    label="Dosage"
                    value={school.avg_sessions_per_group_per_week.toFixed(1)}
                    subtitle={dosageColors.label}
                    borderColor={dosageBorder}
                  />
                  <KPICard
                    label="Flags"
                    value={school.total_flags}
                    borderColor={school.total_flags > 0 ? "border-l-red-500" : "border-l-slate-300"}
                  />
                </div>
              );
            })()}
          </div>

          {/* Flag breakdown (if any) */}
          {school.total_flags > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-800">Flag Breakdown</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(school.flag_breakdown)
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm font-medium"
                    >
                      {FLAG_LABELS[type] ?? type.replace(/_/g, " ")}
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {count}
                      </span>
                    </span>
                  ))}
              </div>
            </section>
          )}

          {/* Education Assistants */}
          {(() => {
            const visibleEAs = school.eas.filter((ea) => ea.is_active !== false);
            return (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">Education Assistants</h2>
            {visibleEAs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No EA data available.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {visibleEAs.map((ea) => (
                  <div
                    key={ea.user_id ?? ea.name}
                    className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3"
                  >
                    {/* EA name + dosage badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{ea.name}</p>
                      <DosageBadge value={ea.weighted_dosage} showLabel />
                    </div>

                    {/* EA stats row */}
                    <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-100 pt-3">
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
                      <div className="flex flex-col items-center gap-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">
                          {ea.avg_per_day_worked != null ? ea.avg_per_day_worked.toFixed(1) : "—"}
                        </span>
                        <span className="text-xs text-slate-400">Sess/day</span>
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

                    {/* Group detail rows */}
                    {ea.groups.length > 0 && (
                      <div className="border-t border-slate-100 pt-3 space-y-1.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Groups</p>
                        {ea.groups.map((g) => {
                          const flagKeys = Object.entries(g.flags).filter(([, v]) => v);
                          return (
                            <div
                              key={g.class_name}
                              className="flex items-center gap-3 text-xs px-2 py-1.5 rounded bg-slate-50"
                            >
                              <span className="font-medium text-slate-700 min-w-[100px] truncate">
                                {g.class_name}
                              </span>
                              <span className="text-slate-500">{g.grade}</span>
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-slate-400" />
                                <span className="text-slate-600 font-mono">
                                  {g.current_letter}
                                </span>
                                <span className="text-slate-400">
                                  ({Math.round(g.progress_pct)}%)
                                </span>
                              </div>
                              <span className="text-slate-500 ml-auto tabular-nums">
                                {g.avg_sessions_per_week.toFixed(1)}/wk
                              </span>
                              {flagKeys.length > 0 && (
                                <span className="text-red-600 font-semibold">
                                  {flagKeys.length} flag{flagKeys.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
            );
          })()}
        </>
      )}
    </div>
  );
}
