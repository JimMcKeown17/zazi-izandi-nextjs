import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  borderColor?: string;
  target?: {
    value: number;
    actual: number;
    label: string;
  };
  trend?: {
    value: number;
    label: string;
  };
  badges?: Array<{ label: string; className: string }>;
}

function getProgressColor(pct: number): string {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

export function KPICard({
  label,
  value,
  subtitle,
  borderColor = "border-l-primary",
  target,
  trend,
  badges,
}: KPICardProps) {
  const targetPct =
    target && target.value > 0
      ? Math.round((target.actual / target.value) * 100)
      : null;

  return (
    <div
      className={cn(
        "bg-white rounded-lg border-l-4 shadow-sm p-4 flex flex-col gap-2",
        borderColor
      )}
    >
      {/* Label */}
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      {/* Value + trend row */}
      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-bold text-slate-900 leading-none">
          {value}
        </span>

        {trend !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend.value >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.value >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              {trend.value >= 0 ? "+" : ""}
              {trend.value} {trend.label}
            </span>
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-slate-500 leading-snug">{subtitle}</p>
      )}

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {badges.map((badge, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                badge.className
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {/* Target progress bar */}
      {target && targetPct !== null && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{target.label}</span>
            <span className="text-xs font-semibold text-slate-600">
              {targetPct}% of target
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                getProgressColor(targetPct)
              )}
              style={{ width: `${Math.min(targetPct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
