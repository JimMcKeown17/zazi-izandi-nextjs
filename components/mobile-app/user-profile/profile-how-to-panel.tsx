export function ProfileHowToPanel({ days = 30 }: { days?: number }) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
        How to read this profile
      </summary>
      <div className="grid gap-4 border-t border-slate-100 px-4 py-4 text-sm leading-relaxed text-slate-600 lg:grid-cols-2">
        <p>
          <strong className="text-slate-800">Lifetime vs windowed.</strong>{" "}
          Lifetime tiles cover all retained history. Active · {days}d and Quiet
          · {days}d describe only the {days}-day window. The stage badge is a
          durable lifetime signal.
        </p>
        <p>
          <strong className="text-slate-800">History limits.</strong> Recent
          sessions show at most 20 rows and clock history shows at most 100.
          Those capped tables must be read alongside the Lifetime totals.
        </p>
        <p>
          <strong className="text-slate-800">Assessment evidence.</strong>{" "}
          Assessment counts describe records captured, and assessment info
          coverage describes how many currently assigned children have at least
          one record. Neither describes what children know now.
        </p>
        <p>
          <strong className="text-slate-800">Opened evidence.</strong> An
          Opened date proves that this signed-in account opened a reporting app
          version. Missing Opened evidence is not proof that the app was never
          opened, because older versions did not send this signal.
        </p>
      </div>
    </details>
  );
}
