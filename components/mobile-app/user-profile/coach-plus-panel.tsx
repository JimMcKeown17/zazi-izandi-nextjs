"use client";

import { useState } from "react";
import { setMobileCoachPlus } from "@/app/(site)/mobile-app/users/actions";
import type { CoachPlusState } from "@/lib/mobile/coach-plus";

interface Props { userId: string; displayName: string; initial: CoachPlusState }

const failure: Record<Exclude<CoachPlusState["kind"], "ok">, string> = {
  unauthorized: "Your session could not authorise this change. Sign in again.",
  refused: "The request was refused. Nothing changed.",
  unavailable: "We could not reach the service. Nothing is confirmed; reload to check.",
};

export function CoachPlusPanel({ userId, displayName, initial }: Props) {
  return <Panel key={userId} userId={userId} displayName={displayName} initial={initial} />;
}

function Panel({ userId, displayName, initial }: Props) {
  const [state, setState] = useState<CoachPlusState>(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const enabled = state.kind === "ok" && state.enabled;

  async function apply() {
    setBusy(true);
    setConfirming(false);
    try {
      setState(await setMobileCoachPlus({ userId, enabled: !enabled }));
    } catch {
      setState({ kind: "unavailable" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="coach-plus-panel" role="region" aria-labelledby={`coach-plus-${userId}`}
         className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id={`coach-plus-${userId}`} className="text-lg font-semibold text-slate-900">AI coach (Plus)</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        {state.kind === "ok"
          ? enabled ? `Plus is on for ${displayName}. The Coach tab shows on their phone after its next refresh.`
                    : `Plus is off for ${displayName}. Switching it on adds a Coach tab to their app.`
          : failure[state.kind]}
      </p>
      {busy ? <p role="status" className="mt-4 text-sm text-slate-600">Saving…</p> : confirming ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Switch Plus {enabled ? "off" : "on"} for {displayName}?</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={apply} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">Confirm</button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={state.kind !== "ok"} onClick={() => setConfirming(true)}
                className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
          Switch Plus {enabled ? "off" : "on"}
        </button>
      )}
    </div>
  );
}
