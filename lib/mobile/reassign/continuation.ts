import {
  compactMobileHandoverProgress,
  isMobileHandoverTerminal,
} from "./job-state";
import type { MobileHandoverJobResponse, MobileReassignResult } from "./types";

export interface MobileHandoverContinuationResult {
  job: MobileHandoverJobResponse;
  error: Extract<MobileReassignResult<never>, { ok: false }> | null;
}

/**
 * Run a browser-driven handover continuation.
 *
 * The first execute is unconditional for every non-terminal job. Django only
 * finalizes a legitimate zero-item `created` job inside its execute endpoint;
 * `retryable` is intentionally a rule for later passes only.
 */
export async function runMobileHandoverContinuations(
  initial: MobileHandoverJobResponse,
  execute: (jobId: string) => Promise<MobileReassignResult<MobileHandoverJobResponse>>,
  onUpdate: (job: MobileHandoverJobResponse) => void
): Promise<MobileHandoverContinuationResult> {
  let current = initial;
  let previousProgress = compactMobileHandoverProgress(initial);
  let firstPass = true;

  while (!isMobileHandoverTerminal(current) && (firstPass || current.job.retryable)) {
    firstPass = false;
    const result = await execute(current.job.id);
    if (!result.ok) return { job: current, error: result };

    current = result.data;
    onUpdate(current);
    const nextProgress = compactMobileHandoverProgress(current);
    if (
      isMobileHandoverTerminal(current) ||
      !current.job.retryable ||
      nextProgress === previousProgress
    ) {
      break;
    }
    previousProgress = nextProgress;
  }

  return { job: current, error: null };
}
