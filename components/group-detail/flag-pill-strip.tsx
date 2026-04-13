import type { EaFlag } from "@/lib/ea/types";

const FLAG_LABELS: Record<EaFlag, string> = {
  ghost_group: "Ghost group",
  moving_too_fast: "Moving too fast",
  curriculum_gaps: "Curriculum gaps",
  stagnation: "Stagnation",
};

interface FlagPillStripProps {
  flags: EaFlag[];
}

export function FlagPillStrip({ flags }: FlagPillStripProps) {
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((f) => (
        <span
          key={f}
          className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700"
        >
          {FLAG_LABELS[f]}
        </span>
      ))}
    </div>
  );
}
