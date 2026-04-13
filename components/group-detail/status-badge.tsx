import type { EaFlag } from "@/lib/ea/types";

interface StatusBadgeProps {
  flags: EaFlag[];
}

export function StatusBadge({ flags }: StatusBadgeProps) {
  if (flags.includes("ghost_group")) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 shrink-0 whitespace-nowrap">
        Low dosage
      </span>
    );
  }
  if (
    flags.includes("moving_too_fast") ||
    flags.includes("stagnation") ||
    flags.includes("curriculum_gaps")
  ) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 shrink-0 whitespace-nowrap">
        Needs attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 shrink-0 whitespace-nowrap">
      On track
    </span>
  );
}
