import { formatDurationMinutes } from "@/lib/mobile/user-profile/presentation";
import type { MobileUserProfileLifetimeTotals } from "@/lib/mobile/user-profile/types";

export function LifetimeSummary({
  totals,
}: {
  totals: MobileUserProfileLifetimeTotals;
}) {
  const tiles = [
    {
      label: "Lifetime clock days",
      value: totals.clock_days.toLocaleString("en-ZA"),
    },
    {
      label: "Lifetime completed clock time",
      value: formatDurationMinutes(totals.clock_minutes_completed),
    },
    {
      label: "Lifetime clock entries",
      value: totals.clock_entries.toLocaleString("en-ZA"),
    },
    {
      label: "Lifetime sessions",
      value: totals.sessions.toLocaleString("en-ZA"),
    },
    {
      label: "Lifetime app assessments",
      value: totals.app_assessments.toLocaleString("en-ZA"),
    },
  ];

  return (
    <section aria-labelledby="lifetime-summary-title">
      <h2 id="lifetime-summary-title" className="font-bold text-slate-900">
        Lifetime summary
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Untruncated totals across all retained history.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((tile) => (
          <article
            key={tile.label}
            data-lifetime-tile="true"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {tile.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {tile.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
