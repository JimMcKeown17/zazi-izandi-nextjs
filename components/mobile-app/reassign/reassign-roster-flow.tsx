"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createMobileReassignment,
  executeMobileReassignment,
  loadMobileReassignment,
  previewMobileReassignRoster,
} from "@/app/(site)/mobile-app/reassign/actions";
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

export function MobileReassignRosterFlow({ candidates, candidatesUnavailable = false }: {
  candidates: MobileReassignEaOption[];
  candidatesUnavailable?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedJobId = getMobileReassignJobId(searchParams);
  const loadedJobIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
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
  const [previousJobUrl, setPreviousJobUrl] = useState<string | null>(null);
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
    requestedJobId && job?.job.id !== requestedJobId
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadedJobIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!requestedJobId || loadedJobIdRef.current === requestedJobId) return;
    let current = true;
    loadedJobIdRef.current = requestedJobId;
    setError(null);
    setPreview(null);
    setRepreview(null);
    setConfirmOpen(false);
    void loadMobileReassignment(requestedJobId).then((result) => {
      if (!current) return;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.data.job.id !== requestedJobId) {
        setError("The saved handover did not match this link. Reload the page to try again.");
        return;
      }
      setJob(result.data);
      setFromEa(result.data.job.from_ea_user_id);
      setToEa(result.data.job.to_ea_user_id);
      setScope(result.data.job.scope);
      setScopeClassId(result.data.job.scope_class_id);
      setReason(result.data.job.reason);
    }).catch(() => {
      if (current) setError("The saved handover could not be loaded. Reload the page to try again.");
    });
    return () => {
      current = false;
      if (loadedJobIdRef.current === requestedJobId) loadedJobIdRef.current = null;
    };
  }, [requestedJobId]);

  function startAnotherHandover() {
    if (!job || !isMobileHandoverTerminal(job) || busy || recoveringSavedJob) return;
    setPreviousJobUrl(getMobileReassignJobUrl(pathname, searchParams, job.job.id));
    const nextQuery = new URLSearchParams(searchParams.toString());
    nextQuery.delete("job");
    router.replace(nextQuery.size ? `${pathname}?${nextQuery}` : pathname);
    loadedJobIdRef.current = null;
    setJob(null);
    setQuery("");
    resetDraft("");
  }

  function resetDraft(nextFromEa: string) {
    setFromEa(nextFromEa);
    setToEa("");
    setScope("roster");
    setScopeClassId(null);
    setPreview(null);
    setRepreview(null);
    setDecisions({});
    setReason("");
    setConfirmOpen(false);
    setError(null);
  }

  async function loadPreview(nextScope = scope, nextClassId = scopeClassId) {
    if (busy || job || recoveringSavedJob) return;
    if (!fromEa) return setError("Choose the departing EA before previewing the roster.");
    if (!UUID_PATTERN.test(fromEa)) return setError("Enter a valid departing EA UUID.");
    setBusy(true);
    setError(null);
    setPreview(null);
    setRepreview(null);
    setConfirmOpen(false);
    try {
      const result = await previewMobileReassignRoster({ fromEa, scope: nextScope, scopeClassId: nextClassId });
      if (!result.ok) return setError(result.message);
      if (result.data.from_ea !== fromEa.toLowerCase() || result.data.scope !== nextScope || result.data.scope_class_id !== nextClassId) {
        return setError("The preview did not match the requested roster. Please preview it again.");
      }
      setScope(nextScope);
      setScopeClassId(nextClassId);
      setPreview(result.data);
      setDecisions({});
    } catch {
      setError("The roster could not be loaded. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function createJob() {
    if (busy || job || recoveringSavedJob || !preview || !fromEa || !toEa) return;
    if (!UUID_PATTERN.test(fromEa) || !UUID_PATTERN.test(toEa)) {
      return setError("Enter valid departing and receiving EA UUIDs.");
    }
    const sourceJobId = loadedJobIdRef.current;
    setBusy(true);
    setError(null);
    try {
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
      if (!mountedRef.current || loadedJobIdRef.current !== sourceJobId) return;
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
    } catch {
      if (mountedRef.current && loadedJobIdRef.current === sourceJobId) setError("The server response was lost. Check for an existing handover before trying to create another.");
    } finally {
      if (mountedRef.current) { setBusy(false); setConfirmOpen(false); }
    }
  }

  async function runContinuations(initial: MobileHandoverJobResponse) {
    const jobId = initial.job.id;
    if (loadedJobIdRef.current !== jobId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await runMobileHandoverContinuations(
        initial,
        async (id) => {
          if (loadedJobIdRef.current !== jobId) {
            return { ok: false, status: 409, code: "invalid_handover_request", message: "The selected handover changed." };
          }
          return executeMobileReassignment(id);
        },
        (updated) => { if (loadedJobIdRef.current === jobId) setJob(updated); }
      );
      if (loadedJobIdRef.current === jobId && result.error) setError(result.error.message);
    } catch {
      if (loadedJobIdRef.current === jobId) setError("The handover response was lost. Keep this link and refresh to check its progress before continuing.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEmptyRoster() {
    if (!job || busy || recoveringSavedJob) return;
    const jobId = job.job.id;
    const sourceEa = job.job.from_ea_user_id;
    setBusy(true);
    setError(null);
    setRepreview(null);
    try {
      const result = await previewMobileReassignRoster({ fromEa: sourceEa, scope: "roster" });
      if (loadedJobIdRef.current !== jobId) return;
      if (!result.ok) return setError(result.message);
      if (result.data.from_ea !== sourceEa || result.data.scope !== "roster" || result.data.scope_class_id !== null) {
        return setError("The refreshed preview did not match the departing roster. Please try again.");
      }
      setRepreview(result.data);
    } catch {
      if (loadedJobIdRef.current === jobId) setError("The departing roster could not be rechecked. Keep this handover link and try again.");
    } finally {
      setBusy(false);
    }
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

      {previousJobUrl ? <p className="text-sm text-slate-600"><a href={previousJobUrl} className="font-medium text-primary underline">Previous handover</a> — keep this link to return to its results.</p> : null}

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      {candidatesUnavailable ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">The EA list could not be loaded.</p>
        <p className="mt-1">Try again to load the list, or use a known mobile app user UUID below. Saved handovers can still be opened using their links.</p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => router.refresh()} disabled={busy || recoveringSavedJob}>Retry EA list</Button>
      </div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="ea-search">Find the departing EA</label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input id="ea-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search EA name, school, or UUID" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select aria-label="Departing EA" disabled={busy || recoveringSavedJob || Boolean(job)} value={fromEa} onChange={(event) => resetDraft(event.target.value)} className="mt-3 w-full rounded-md border border-slate-300 bg-white p-2 text-sm">
          <option value="">Choose the departing EA</option>
          {filteredCandidates.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.displayName} — {candidate.school}</option>)}
        </select>
        {!candidatesUnavailable && filteredCandidates.length === 0 ? <p role="status" className="mt-2 text-sm text-slate-600">
          {candidates.length === 0
            ? "No EAs are available in the current reporting list."
            : "No EAs match this search. Try another name, school, or UUID."}
        </p> : null}
        <p className="mt-2 text-xs text-slate-500">If the EA is missing from this list, paste their mobile app user UUID below.</p>
        <input aria-label="Departing EA UUID" disabled={busy || recoveringSavedJob || Boolean(job)} value={fromEa} onChange={(event) => resetDraft(event.target.value)} placeholder="Departing EA UUID" className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-xs" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void loadPreview()} disabled={busy || recoveringSavedJob || Boolean(job) || !fromEa}>{busy || recoveringSavedJob ? "Loading…" : "Preview roster"}</Button>
          {preview?.classes.length ? <select aria-label="Roster scope" value={scope === "class" ? scopeClassId ?? "" : "roster"} onChange={(event) => { const value = event.target.value; void loadPreview(value === "roster" ? "roster" : "class", value === "roster" ? null : value); }} className="rounded-md border border-slate-300 bg-white px-3 text-sm" disabled={busy}>
            <option value="roster">Whole roster</option>
            {selectedClassOptions.map((entity) => <option key={entity.entity_id} value={entity.entity_id}>One class: {entity.name || entity.entity_id}</option>)}
          </select> : null}
        </div>
      </section>

      {preview && !job ? <>
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
        {!isMobileHandoverTerminal(job) ? <div className="mt-4"><Button type="button" onClick={() => void runContinuations(job)} disabled={busy || recoveringSavedJob || job.job.in_flight}><RefreshCw className="mr-2 h-4 w-4" />Continue handover</Button>{job.job.in_flight ? <p className="mt-2 text-xs text-slate-500">Another continuation is currently running. Refresh shortly to recover its latest state.</p> : null}</div> : null}
        {isMobileHandoverTerminal(job) ? <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4"><h3 className="flex items-center gap-2 font-semibold text-blue-950"><CheckCircle2 className="h-5 w-5" />Confirm the departing roster is now empty</h3><p className="mt-1 text-sm text-blue-900">Re-run the whole-roster preview. This catches any child that briefly had no assignment history when this job was created.</p><Button type="button" variant="outline" className="mt-3" onClick={() => void confirmEmptyRoster()} disabled={busy || recoveringSavedJob}>Re-run roster preview</Button>{repreview ? <p className="mt-3 text-sm text-blue-950">The refreshed preview contains {repreview.counts.classes + repreview.counts.groups + repreview.counts.children + repreview.counts.scalar_only + repreview.counts.unresolved} record{repreview.counts.classes + repreview.counts.groups + repreview.counts.children + repreview.counts.scalar_only + repreview.counts.unresolved === 1 ? "" : "s"}. {repreview.counts.classes + repreview.counts.groups + repreview.counts.children + repreview.counts.scalar_only + repreview.counts.unresolved === 0 ? "The roster is empty." : "Create a follow-up job for any remaining records."}</p> : null}</div> : null}
        {isMobileHandoverTerminal(job) ? <Button type="button" variant="outline" className="mt-4" onClick={startAnotherHandover} disabled={busy || recoveringSavedJob}>Start another handover</Button> : null}
        <p className="mt-5 text-sm text-slate-600">{job.job.status === "complete"
          ? "This handover does not retire the departing EA’s mobile account. Before an administrator retires it, re-check that the departing roster is empty and confirm the successor can sign in and see the transferred roster in the mobile app."
          : "Keep the departing EA’s mobile account active while this handover needs attention."}</p>
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
