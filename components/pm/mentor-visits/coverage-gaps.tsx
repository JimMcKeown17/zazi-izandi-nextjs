import type { CoverageData } from "@/lib/pm/types";
import { KPICard } from "@/components/pm/shared/kpi-card";
import { TREATMENT_SCHOOLS, SEF_SCHOOLS } from "@/lib/pm/cohorts";

interface CoverageGapsProps {
  data: CoverageData;
}

const COVERAGE_WINDOW_DAYS = 30;

function isTargetSchool(schoolName: string): boolean {
  const upper = schoolName.toUpperCase();
  return TREATMENT_SCHOOLS.has(upper) || SEF_SCHOOLS.has(upper);
}

const TARGET_SCHOOL_COUNT = TREATMENT_SCHOOLS.size + SEF_SCHOOLS.size;

function getCoverageColor(rate: number): string {
  if (rate >= 80) return "border-l-green-500";
  if (rate >= 60) return "border-l-amber-500";
  return "border-l-red-500";
}

function getDaysBadge(days: number | null): { text: string; className: string } {
  if (days === null) return { text: "Never visited", className: "bg-red-100 text-red-700" };
  if (days >= 60) return { text: `${days}d`, className: "bg-red-100 text-red-700" };
  if (days >= 45) return { text: `${days}d`, className: "bg-amber-100 text-amber-700" };
  return { text: `${days}d`, className: "bg-yellow-50 text-yellow-700" };
}

export function CoverageGaps({ data }: CoverageGapsProps) {
  // Filter gaps to only treatment + SEF schools, then apply 30-day window
  const targetGaps = data.gaps.filter(
    (g) => isTargetSchool(g.school) && (g.days_since === null || g.days_since >= COVERAGE_WINDOW_DAYS)
  );

  const visitedCount = TARGET_SCHOOL_COUNT - targetGaps.length;
  const coverageRate = TARGET_SCHOOL_COUNT > 0 ? (visitedCount / TARGET_SCHOOL_COUNT) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KPICard
          label={`School Coverage (${COVERAGE_WINDOW_DAYS} days)`}
          value={`${coverageRate.toFixed(1)}%`}
          subtitle={`${visitedCount} of ${TARGET_SCHOOL_COUNT} schools visited`}
          borderColor={getCoverageColor(coverageRate)}
        />
        <KPICard
          label="Coverage Gaps"
          value={targetGaps.length}
          subtitle={`schools not visited in ${COVERAGE_WINDOW_DAYS}+ days`}
          borderColor={targetGaps.length > 0 ? "border-l-red-500" : "border-l-green-500"}
        />
      </div>

      {targetGaps.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm font-semibold text-slate-800 mb-3">Schools Needing Visits</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">School</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Last Visit</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Days Since</th>
                </tr>
              </thead>
              <tbody>
                {targetGaps.map((gap) => {
                  const badge = getDaysBadge(gap.days_since);
                  return (
                    <tr key={gap.school} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">{gap.school}</td>
                      <td className="py-2 px-3 text-slate-500">{gap.last_visit || "Never"}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                          {badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
