import { getDosageLevel } from "@/lib/schools-2026/dosage";
import type { EnrichedSchool2026 } from "@/lib/schools-2026/types";

interface DosageMosaicProps {
  schools: EnrichedSchool2026[];
}

const DOT_BG = {
  green: "bg-green-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
} as const;

/**
 * A compact visual showing every school as a small colored circle,
 * sorted by dosage level (green → yellow → red) so the ratio
 * is instantly legible.
 */
export default function DosageMosaic({ schools }: DosageMosaicProps) {
  const sorted = [...schools]
    .map((s) => ({
      name: s.school_name,
      level: getDosageLevel(s.avg_sessions_per_group_per_week, s.school_type),
    }))
    .sort((a, b) => {
      const order = { green: 0, yellow: 1, red: 2 };
      return order[a.level] - order[b.level];
    });

  const counts = {
    green: sorted.filter((s) => s.level === "green").length,
    yellow: sorted.filter((s) => s.level === "yellow").length,
    red: sorted.filter((s) => s.level === "red").length,
  };

  return (
    <div>
      {/* Dot grid */}
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((s, i) => (
          <div
            key={`${s.name}-${i}`}
            className={`w-4 h-4 rounded-full ${DOT_BG[s.level]}`}
            title={s.name}
          />
        ))}
      </div>

      {/* Summary counts */}
      <div className="flex items-center gap-5 mt-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          {counts.green} On Track
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          {counts.yellow} Needs Attention
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          {counts.red} Low Dosage
        </span>
      </div>
    </div>
  );
}
