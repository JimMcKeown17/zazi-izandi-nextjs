import { AlarmClock, ClockArrowUp, TimerReset, UsersRound } from "lucide-react";

import { formatDuration } from "@/lib/mobile/time-entries/presentation";
import type { MobileTimeEntriesActivityResponse } from "@/lib/mobile/time-entries/types";

const ICON_STYLES = {
  blue: "bg-primary-50 text-primary",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
} as const;

export function AttendanceSummary({
  data,
}: {
  data: MobileTimeEntriesActivityResponse;
}) {
  const cards = [
    {
      label: "Recorded hours",
      value: formatDuration(data.summary.completed_duration_minutes),
      detail: `${data.summary.completed_entries} completed shifts`,
      icon: AlarmClock,
      tone: "blue" as const,
    },
    {
      label: "Clocked in now",
      value: data.summary.active_entries.toLocaleString("en-ZA"),
      detail: "Open shifts at report time",
      icon: ClockArrowUp,
      tone: "green" as const,
    },
    {
      label: "EAs with entries",
      value: data.summary.eas_with_entries.toLocaleString("en-ZA"),
      detail: `Across the last ${data.days} days`,
      icon: UsersRound,
      tone: "slate" as const,
    },
    {
      label: "Automatic clock-outs",
      value: data.summary.automatic_clock_outs.toLocaleString("en-ZA"),
      detail: "Shifts closed at the 10-hour limit",
      icon: TimerReset,
      tone: "amber" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {card.value}
                </p>
              </div>
              <span className={`rounded-lg p-2.5 ${ICON_STYLES[card.tone]}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {card.detail}
            </p>
          </div>
        );
      })}
    </div>
  );
}
