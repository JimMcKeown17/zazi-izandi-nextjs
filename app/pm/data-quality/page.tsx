import { getDataQuality } from "@/lib/pm/api";
import { AlertTriangle, CheckCircle2, MapPinOff } from "lucide-react";

export default async function DataQualityPage() {
  const { data, isLive } = await getDataQuality();
  const cal = data.closure_calendar;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Data quality API unavailable.</span>{" "}
            The list below may be empty.
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900">Data Quality</h1>
        <p className="text-sm text-slate-500">
          Diagnostic signals only — none of these change the headline metrics.
        </p>
      </div>

      {/* Closure calendar health */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
          {cal.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  : <AlertTriangle className="h-4 w-4 text-amber-500" />}
          Closure calendar
        </h2>
        <p className="text-sm text-slate-600">
          {cal.ok
            ? `Healthy — last synced ${cal.last_ok_at ? new Date(cal.last_ok_at).toLocaleString() : "unknown"}, ${cal.closures_count} closures covering ${cal.date_from} to ${cal.date_to}.`
            : "Stale or unavailable — dosage may be understated until the Masi calendar sync succeeds. Check the Render cron for sync_masi_calendar."}
        </p>
      </section>

      {/* Unexplained silence */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900 mb-2">Schools silent with no closure on record</h2>
        {data.silent_schools.length === 0 ? (
          <p className="text-sm text-slate-500">None. Every silent school has a closure explaining it.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {data.silent_schools.map((s) => (
              <li key={s.school} className="py-2 flex justify-between gap-4">
                <span className="text-slate-800">{s.school}</span>
                <span className="text-slate-500">
                  last session {s.last_session_date} · {s.expected_open_days} expected-open days silent
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Break or problem? Author the closure in Masi (calendar corrects the metric) or investigate the school.
        </p>
      </section>

      {/* Unmapped schools */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <MapPinOff className="h-4 w-4 text-slate-400" /> Schools without a Masi identity
        </h2>
        {data.unmapped_schools.length === 0 ? (
          <p className="text-sm text-slate-500">None. Every active school resolves to a Masi identity.</p>
        ) : (
          <p className="text-sm text-slate-700">
            These schools fall back to global-only closures (their term breaks won't be excluded):{" "}
            <span className="font-medium">{data.unmapped_schools.join(", ")}</span>
          </p>
        )}
      </section>
    </div>
  );
}
