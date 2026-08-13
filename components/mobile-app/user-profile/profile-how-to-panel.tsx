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
          <strong className="text-slate-800">Opened evidence.</strong>{" "}
          {`An "Opened" date is proof the app was opened by this signed-in account — it says the app reached them, not that they are teaching with it or still using it. Older app versions don't send it, so missing Opened evidence is not proof of absence.`}
        </p>
      </div>
    </details>
  );
}
