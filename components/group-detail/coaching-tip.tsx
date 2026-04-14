import { Lightbulb } from "lucide-react";
import type { EaFlag } from "@/lib/ea/types";

const FLAG_TIPS: Record<EaFlag, string> = {
  ghost_group:
    "This group hasn\u2019t had a session recently \u2014 try to schedule one soon",
  moving_too_fast:
    "Try spending a few more sessions on each letter before moving on",
  curriculum_gaps:
    "Some letters may have been skipped \u2014 consider going back to review",
  stagnation:
    "This group has been on the same letter for a while \u2014 try a different game",
};

const FLAG_PRIORITY: EaFlag[] = [
  "ghost_group",
  "moving_too_fast",
  "curriculum_gaps",
  "stagnation",
];

export function getTopFlag(flags: EaFlag[]): EaFlag | null {
  for (const f of FLAG_PRIORITY) {
    if (flags.includes(f)) return f;
  }
  return null;
}

export function CoachingTip({ flag }: { flag: EaFlag }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
      <span>{FLAG_TIPS[flag]}</span>
    </div>
  );
}
