import { cn } from "@/lib/utils";
import { getDosageLevel, DOSAGE_COLORS } from "@/lib/pm/constants";

interface DosageBadgeProps {
  value: number;
  showLabel?: boolean;
}

export function DosageBadge({ value, showLabel = false }: DosageBadgeProps) {
  const level = getDosageLevel(value);
  const colors = DOSAGE_COLORS[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold",
        colors.bg,
        colors.border,
        colors.text
      )}
    >
      <span className="tabular-nums">{value.toFixed(1)}</span>
      {showLabel && <span className="font-normal">{colors.label}</span>}
    </span>
  );
}
