import { isMobileHandoverTerminal } from "./job-state";
import type { MobileHandoverJobResponse, MobileReassignResult } from "./types";

export interface MobileHandoverContinuationResult {
  job: MobileHandoverJobResponse;
  error: Extract<MobileReassignResult<never>, { ok: false }> | null;
}

/**
 * Every continuation the server can legitimately ask for completes at least
 * one item, so a job can never need more passes than items (plus the single
 * terminalizing pass of an empty job). The absolute ceiling backstops even a
 * server that misreports `total_items`: the Django adapter's 10,000-row
 * pagination ceiling divided by the 10-item execute bound, plus one.
 */
const ABSOLUTE_MAX_PASSES = 1001;

/** Mirrors Django's Item.DISPATCHABLE_STATES: what an execute pass may send. */
const DISPATCHABLE_ITEM_STATES: ReadonlySet<string> = new Set(["pending", "error"]);

function dispatchableCount(job: MobileHandoverJobResponse): number {
  return job.items.filter((item) => DISPATCHABLE_ITEM_STATES.has(item.state)).length;
}

function stalled(message: string): MobileHandoverContinuationResult["error"] {
  return { ok: false, status: 200, code: "handover_stalled", message };
}

/**
 * Run a browser-driven handover continuation.
 *
 * The first execute is unconditional for every non-terminal job. Django only
 * finalizes a legitimate zero-item `created` job inside its execute endpoint;
 * `retryable` is intentionally a rule for later passes only.
 *
 * Automatic passes after the first require SEMANTIC progress, not field
 * drift: the set of still-dispatchable items must shrink, and the cursor may
 * only move forward within `[-1, total_items)`. Cursor motion alone is not
 * progress — a stale or defective server incrementing an unbounded cursor
 * with `retryable: true` must not drive an endless privileged execute loop.
 * A pass that changes nothing (a busy seed lease, a timed-out item) stops
 * with a visible, recoverable error; the operator's Continue button re-enters
 * this same runner. A pass ceiling independent of every server-supplied field
 * backstops the rule.
 */
export async function runMobileHandoverContinuations(
  initial: MobileHandoverJobResponse,
  execute: (jobId: string) => Promise<MobileReassignResult<MobileHandoverJobResponse>>,
  onUpdate: (job: MobileHandoverJobResponse) => void
): Promise<MobileHandoverContinuationResult> {
  let current = initial;
  let firstPass = true;
  let passes = 0;
  let previousCursor = initial.job.progress_cursor;
  let previousDispatchable = dispatchableCount(initial);
  const maxPasses = Math.min(
    Math.max(initial.job.total_items, 0) + 2,
    ABSOLUTE_MAX_PASSES
  );

  while (!isMobileHandoverTerminal(current) && (firstPass || current.job.retryable)) {
    if (passes >= maxPasses) {
      return {
        job: current,
        error: stalled(
          "The handover has run more continuation passes than its item count allows. Stopping as a precaution — review the item list, then press Continue to try again."
        ),
      };
    }
    passes += 1;
    firstPass = false;

    const result = await execute(current.job.id);
    if (!result.ok) return { job: current, error: result };

    current = result.data;
    onUpdate(current);
    if (isMobileHandoverTerminal(current) || !current.job.retryable) break;

    const cursor = current.job.progress_cursor;
    const cursorValid =
      Number.isInteger(cursor) &&
      cursor >= previousCursor &&
      cursor < current.job.total_items;
    const nextDispatchable = dispatchableCount(current);
    if (!cursorValid) {
      return {
        job: current,
        error: stalled(
          "The server reported an inconsistent progress position for this handover. Stopping as a precaution — press Continue to try again."
        ),
      };
    }
    if (nextDispatchable >= previousDispatchable) {
      return {
        job: current,
        error: stalled(
          "The last pass finished without completing any record (the transfer service may be briefly busy). Wait a moment, then press Continue."
        ),
      };
    }
    previousCursor = cursor;
    previousDispatchable = nextDispatchable;
  }

  return { job: current, error: null };
}
