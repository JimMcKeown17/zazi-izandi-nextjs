import { cn } from "@/lib/utils";
import type { HealthSignal } from "@/lib/pm/types";
import { HEALTH_STATUS_CONFIG } from "@/lib/pm/constants";

interface HealthBadgeProps {
  health: HealthSignal;
}

export function HealthBadge({ health }: HealthBadgeProps) {
  const config = HEALTH_STATUS_CONFIG[health.status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide text-white",
        config.bg
      )}
    >
      <span className={cn("w-2 h-2 rounded-full bg-white/50", config.dot)} />
      {config.label}
    </span>
  );
}
