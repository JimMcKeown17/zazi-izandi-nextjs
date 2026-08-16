import type { MobileHandoverJobResponse } from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MOBILE_REASSIGN_JOB_QUERY_KEY = "job";

const TERMINAL_STATUSES = new Set([
  "complete",
  "complete_with_refusals",
  "complete_with_exclusions",
  "needs_repreview",
  "integrity_fault",
]);

export function isMobileHandoverTerminal(job: MobileHandoverJobResponse): boolean {
  return TERMINAL_STATUSES.has(job.job.status);
}

export function getMobileReassignJobId(search: string | URLSearchParams): string | null {
  const query = typeof search === "string" ? new URLSearchParams(search) : search;
  const jobId = query.get(MOBILE_REASSIGN_JOB_QUERY_KEY);
  return jobId && UUID_PATTERN.test(jobId) ? jobId.toLowerCase() : null;
}

export function getMobileReassignJobUrl(
  pathname: string,
  search: string | URLSearchParams,
  jobId: string
): string {
  const validatedJobId = getMobileReassignJobId(
    new URLSearchParams([[MOBILE_REASSIGN_JOB_QUERY_KEY, jobId]])
  );
  if (!validatedJobId) throw new TypeError("jobId must be a canonical UUID");

  const query = new URLSearchParams(
    typeof search === "string" ? search : search.toString()
  );
  query.set(MOBILE_REASSIGN_JOB_QUERY_KEY, validatedJobId);
  return `${pathname}?${query.toString()}`;
}

export function compactMobileHandoverProgress(
  job: MobileHandoverJobResponse
): string {
  return `${job.job.status}:${job.job.progress_cursor}:${job.items
    .map((item) => item.state)
    .join(",")}`;
}
