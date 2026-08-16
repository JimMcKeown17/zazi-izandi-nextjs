"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createMobileReassignment,
  executeMobileReassignment,
  loadMobileReassignment,
  previewMobileReassignRoster,
} from "@/app/mobile-app/reassign/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  MobileHandoverItem,
  MobileHandoverJobResponse,
  MobileReassignDecision,
  MobileReassignRosterEntity,
  MobileReassignRosterPreview,
  MobileReassignScope,
} from "@/lib/mobile/reassign/types";
import {
  getMobileReassignJobId,
  getMobileReassignJobUrl,
  isMobileHandoverTerminal,
} from "@/lib/mobile/reassign/job-state";
import { runMobileHandoverContinuations } from "@/lib/mobile/reassign/continuation";

export interface MobileReassignEaOption {
  userId: string;
  displayName: string;
  school: string;
  employmentStatus: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REFUSAL_COPY: Partial<Record<MobileHandoverItem["refusal_code"], string>> = {
  target_name_collision: "B already has a class with this name at this school — rename one first",
  shared_class_unsupported: "this class shows two active holders — needs manual repair",
  no_current_holder: "nobody currently holds this record — nothing to move",
};

function rosterLabel(entity: MobileReassignRosterEntity): string {
  const noun = entity.entity_kind === "child" ? "Child" : entity.entity_kind;
  return entity.name ? `${noun}: ${entity.name}` : `${noun}: ${entity.entity_id}`;
}

function RosterList({ title, entities }: { title: string; entities: MobileReassignRosterEntity[] }) {
  if (!entities.length) return null;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">{title} ({entities.length})</h3>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-slate-700 [content-visibility:auto]">
        {entities.map((entity) => (
          <li key={`${entity.entity_kind}:${entity.entity_id}`}>
            {rosterLabel(entity)}
            {entity.source === "scalar_only" ? " · scalar-only assignment" : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MobileReassignRosterFlow({ candidates }: { candidates: MobileReassignEaOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedJobId = getMobileReassignJobId(searchParams);
  const loadedJobIdRef = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [fromEa, setFromEa] = useState("");
  const [toEa, setToEa] = useState("");
  const [scope, setScope] = useState<MobileReassignScope>("roster");
  const [scopeClassId, setScopeClassId] = useState<string | null>(null);
  const [preview, setPreview] = useState<MobileReassignRosterPreview | null>(null);
  const [decisions, setDecisions] = useState<Record<string, MobileReassignDecision>>({});
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [job, setJob] = useState<MobileHandoverJobResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repreview, setRepreview] = useState<MobileReassignRosterPreview | null>(null);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return candidates;
    return candidates.filter((candidate) =>
      `${candidate.displayName} ${candidate.school} ${candidate.userId}`.toLowerCase().includes(normalized)
    );
  }, [candidates, query]);

  const fromCandidate = candidates.find((candidate) => candidate.userId === fromEa);
  const toCandidate = candidates.find((candidate) => candidate.userId === toEa);
  const selectedClassOptions = preview?.classes ?? [];
  const allUnresolvedDecided = preview?.unresolved.every((entity) => decisions[entity.entity_id]) ?? true;
  const recoveringSavedJob = Boolean(
    requestedJobId && job?.job.id !== requestedJobId && error === null
  );

  useEffect(() => {
    if (!requestedJobId || loadedJobIdRef.current === requestedJobId) return;
    loadedJobIdRef.current = requestedJobId;
    void loadMobileReassignment(requestedJobId).then((result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setJob(result.data);
      setFromEa(result.data.job.from_ea_user_id);
      setToEa(result.data.job.to_ea_user_id);
      setScope(result.data.job.scope);
      setScopeClassId(result.data.job.scope_class_id);
      setReason(result.data.job.reason);
    }).catch(() => {
      setError("The saved handover could not be loaded.");
    });
  }, [requestedJobId]);

  async function loadPreview(nextScope = scope, nextClassId = scopeClassId) {
    if (!fromEa) return setError("Choose the departing EA before previewing the roster.");
    if (!UUID_PATTERN.test(fromEa)) return setError("Enter a valid departing EA UUID.");
    setBusy(true);
    setError(null);
    setRepreview(null);
    const result = await previewMobileReassignRoster({
      fromEa,
      scope: nextScope,
      scopeClassId: nextClassId,
    });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setScope(nextScope);
    setScopeClassId(nextClassId);
    setPreview(result.data);
    setDecisions({});
  }

  async function createJob() {
    if (!preview || !fromEa || !toEa) return;
    if (!UUID_PATTERN.test(fromEa) || !UUID_PATTERN.test(toEa)) {
      return setError("Enter valid departing and receiving EA UUIDs.");
    }
    setBusy(true);
    setError(null);
    const result = await createMobileReassignment({
      fromEa,
      toEa,
      scope,
      scopeClassId,
      reason,
      unresolvedDecisions: preview.unresolved.map((entity) => ({
        entityKind: entity.entity_kind,
        entityId: entity.entity_id,
        decision: decisions[entity.entity_id]!,
      })),
    });
    setBusy(false);
    setConfirmOpen(false);
    if (!result.ok) {
      if (result.code === "handover_job_already_active") {
        return setError("A handover for one of these EAs is already active. Recover the existing job from its handover link (the URL containing ?job=...) before starting another.");
      }
      return setError(result.message);
    }
    setJob(result.data);
    loadedJobIdRef.current = result.data.job.id;
    router.replace(getMobileReassignJobUrl(pathname, searchParams, result.data.job.id));
    await runContinuations(result.data);
  }

  async function runContinuations(initial: MobileHandoverJobResponse) {
    setBusy(true);
    setError(null);
    const result = await runMobileHandoverContinuations(
      initial,
      executeMobileReassignment,
      setJob
    );
    if (result.error) setError(result.error.message);
    setBusy(false);
  }

  async function confirmEmptyRoster() {
    if (!fromEa) return;
    setBusy(true);
    setError(null);
    const result = await previewMobileReassignRoster({ fromEa, scope: "roster" });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setRepreview(result.data);
  }

  return (
    <div data-testid="mobile-reassign-roster-flow" className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mobile app operations</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">EA left — reassign roster</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Preview every record held by the departing EA, choose a successor, and run a durable handover.
        </p>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="ea-search">Find the departing EA</label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input id="ea-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search EA name, school, or UUID" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select aria-label="Departing EA" value={fromEa} onChange={(event) => { setFromEa(event.target.value); setPreview(null); setJob(null); }} className="mt-3 w-full rounded-md border border-slate-300 bg-white p-2 text-sm">
          <option value="">Choose the departing EA</option>
          {filteredCandidates.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.displayName} — {candidate.school}</option>)}
        </select>
        <p className="mt-2 text-xs text-slate-500">If their Clerk account is already deactivated and absent from this list, paste their UUID below.</p>
        <input aria-label="Departing EA UUID" value={fromEa} onChange={(event) => { setFromEa(event.target.value); setPreview(null); setJob(null); }} placeholder="Departing EA UUID" className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-xs" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void loadPreview()} disabled={busy || recoveringSavedJob || !fromEa}>{busy || recoveringSavedJob ? "Loading…" : "Preview roster"}</Button>
          {preview?.classes.length ? <select aria-label="Roster scope" value={scope === "class" ? scopeClassId ?? "" : "roster"} onChange={(event) => { const value = event.target.value; void loadPreview(value === "roster" ? "roster" : "class", value === "roster" ? null : value); }} className="rounded-md border border-slate-300 bg-white px-3 text-sm" disabled={busy}>
            <option value="roster">Whole roster</option>
            {selectedClassOptions.map((entity) => <option key={entity.entity_id} value={entity.entity_id}>One class: {entity.name || entity.entity_id}</option>)}
          </select> : null}
        </div>
      </section>

      {preview ? <>
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h2 className="font-semibold text-slate-900">Preview for {preview.from_ea_name || fromCandidate?.displayName || preview.from_ea}</h2>
          <p className="mt-1 text-sm text-slate-700">{preview.counts.classes} classes · {preview.counts.groups} groups · {preview.counts.children} children · {preview.counts.scalar_only} scalar-only records · {preview.counts.unresolved} unresolved</p>
        </section>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <RosterList title="Classes" entities={preview.classes} />
          <RosterList title="Groups" entities={preview.groups} />
          <RosterList title="Children" entities={preview.children} />
          <RosterList title="Scalar-only records" entities={preview.scalar_only} />
        </div>
        {preview.unresolved.length ? <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 font-semibold text-amber-950"><AlertTriangle className="h-5 w-5" /> Resolve these records first</h2>
          <p className="mt-1 text-sm text-amber-900">Each item must be deliberately moved or left with the departing EA before the server will create the job.</p>
          <div className="mt-3 space-y-3">
            {preview.unresolved.map((entity) => <div key={`${entity.entity_kind}:${entity.entity_id}`} className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-800">{rosterLabel(entity)} · {entity.reason.replaceAll("_", " ")}</span>
              <select aria-label={`Decision for ${entity.entity_id}`} value={decisions[entity.entity_id] ?? ""} onChange={(event) => setDecisions((current) => ({ ...current, [entity.entity_id]: event.target.value as MobileReassignDecision }))} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
                <option value="">Choose a decision</option><option value="move">Move with this handover</option><option value="leave">Leave with departing EA</option>
              </select>
            </div>)}
          </div>
        </section> : null}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Choose successor and reason</h2>
          <select aria-label="Successor EA" value={toEa} onChange={(event) => setToEa(event.target.value)} className="mt-3 w-full rounded-md border border-slate-300 bg-white p-2 text-sm">
            <option value="">Choose the receiving EA</option>
            {candidates.filter((candidate) => candidate.userId !== fromEa && candidate.employmentStatus?.toLowerCase() === "active").map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.displayName} — {candidate.school}</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500">If the successor is not in the current reporting list, paste their active EA UUID below. The server re-checks eligibility before a job is created.</p>
          <input aria-label="Successor EA UUID" value={toEa} onChange={(event) => setToEa(event.target.value)} placeholder="Receiving EA UUID" className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-xs" />
          <textarea aria-label="Reason for reassignment" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="Why is this roster moving?" className="mt-3 min-h-24 w-full rounded-md border border-slate-300 p-2 text-sm" />
          <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">{reason.trim().length}/200 characters</p><Button type="button" onClick={() => setConfirmOpen(true)} disabled={!toEa || !reason.trim() || !allUnresolvedDecided || busy || recoveringSavedJob}>Review and confirm</Button></div>
        </section>
      </> : null}

      {job ? <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">{job.job.status === "integrity_fault" ? <ShieldAlert className="h-5 w-5 text-red-600" /> : <LoaderCircle className={busy ? "h-5 w-5 animate-spin text-primary" : "h-5 w-5 text-primary"} />} Handover {job.job.status.replaceAll("_", " ")}</h2>
        <p className="mt-1 text-sm text-slate-700">{job.job.summary}</p>
        <p className="mt-1 text-xs text-slate-500">{job.items.length - job.items.filter((item) => item.state === "pending" || item.state === "error").length} of {job.job.total_items} records have a final state.</p>
        <ul className="mt-4 space-y-2">
          {job.items.map((item) => <li key={`${item.entity_kind}:${item.entity_id}`} className="rounded-md border border-slate-200 p-3 text-sm"><span className="font-medium text-slate-900">{item.entity_kind}: {item.entity_id}</span><span className="ml-2 text-slate-600">{item.state}</span><p className="mt-1 text-slate-600">{REFUSAL_COPY[item.refusal_code] ?? item.message}</p>{item.remaining_foreign_claims && item.remaining_foreign_claims > 0 ? <p className="mt-1 text-amber-800">This child still has {item.remaining_foreign_claims} foreign claim{item.remaining_foreign_claims === 1 ? "" : "s"}.</p> : null}</li>)}
        </ul>
        {!isMobileHandoverTerminal(job) ? <div className="mt-4"><Button type="button" onClick={() => void runContinuations(job)} disabled={busy || job.job.in_flight}><RefreshCw className="mr-2 h-4 w-4" />Continue handover</Button>{job.job.in_flight ? <p className="mt-2 text-xs text-slate-500">Another continuation is currently running. Refresh shortly to recover its latest state.</p> : null}</div> : null}
        {isMobileHandoverTerminal(job) ? <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4"><h3 className="flex items-center gap-2 font-semibold text-blue-950"><CheckCircle2 className="h-5 w-5" />Confirm the departing roster is now empty</h3><p className="mt-1 text-sm text-blue-900">Re-run the whole-roster preview. This catches any child that briefly had no assignment history when this job was created.</p><Button type="button" variant="outline" className="mt-3" onClick={() => void confirmEmptyRoster()} disabled={busy}>Re-run roster preview</Button>{repreview ? <p className="mt-3 text-sm text-blue-950">The refreshed preview contains {repreview.counts.classes + repreview.counts.groups + repreview.counts.children + repreview.counts.scalar_only + repreview.counts.unresolved} record{repreview.counts.classes + repreview.counts.groups + repreview.counts.children + repreview.counts.scalar_only + repreview.counts.unresolved === 1 ? "" : "s"}. {repreview.counts.classes + repreview.counts.groups + repreview.counts.children + repreview.counts.scalar_only + repreview.counts.unresolved === 0 ? "The roster is empty." : "Create a follow-up job for any remaining records."}</p> : null}</div> : null}
        <p className="mt-5 text-sm text-slate-600">If this EA is leaving permanently, also deactivate their account in <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" className="font-medium text-primary underline">Clerk</a>.</p>
      </section> : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm roster handover</DialogTitle><DialogDescription>This will create a durable job for {fromCandidate?.displayName || fromEa} → {toCandidate?.displayName || toEa}. Each item is transferred separately and any refusal remains visible for follow-up.</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button type="button" onClick={() => void createJob()} disabled={busy}>{busy ? "Creating…" : "Create and execute handover"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
