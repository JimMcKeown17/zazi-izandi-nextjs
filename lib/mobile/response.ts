import { mobileSessionReviewFlagsSchema, mobileSessionsActivitySchema } from "./schema";
import { SESSION_REVIEW_ALERTS_UNAVAILABLE } from "./session-review-copy";
import type {
  MobileSessionReviewFlagsResponse,
  MobileSessionsActivityResponse,
} from "./types";

export { SESSION_REVIEW_ALERTS_UNAVAILABLE } from "./session-review-copy";

export type MobileSessionsActivityResult =
  | { ok: true; data: MobileSessionsActivityResponse }
  | { ok: false; status: number; message: string };

export type MobileSessionReviewFlagsResult =
  | { ok: true; data: MobileSessionReviewFlagsResponse }
  | { ok: false; status: number; message: string };

export async function decodeMobileSessionsActivityResponse(
  response: Response,
  expected: { schoolType: "ecd" | "primary" | null }
): Promise<MobileSessionsActivityResult> {
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message:
        response.status === 400
          ? "The selected report filters are invalid."
          : "The mobile-app report service could not return session data.",
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      message: "The mobile-app report returned an unexpected data format.",
    };
  }

  const parsed = mobileSessionsActivitySchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      status: 502,
      message: "The mobile-app report returned an unexpected data format.",
    };
  }

  // Fail closed: the report must confirm it applied the requested school-type
  // filter. A backend that silently ignores the filter (e.g. a version deployed
  // before this contract) echoes a mismatched or absent school_type; we must
  // never present its unfiltered data as an ECD/Primary-filtered report.
  if ((parsed.data.applied_filters.school_type ?? null) !== expected.schoolType) {
    return {
      ok: false,
      status: 502,
      message: "The mobile-app report could not confirm the ECD/Primary filter was applied.",
    };
  }

  return { ok: true, data: parsed.data };
}

export async function decodeMobileSessionReviewFlagsResponse(
  response: Response,
  expected: {
    schoolId: string | null;
    schoolType: "ecd" | "primary" | null;
  }
): Promise<MobileSessionReviewFlagsResult> {
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: SESSION_REVIEW_ALERTS_UNAVAILABLE,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      message: SESSION_REVIEW_ALERTS_UNAVAILABLE,
    };
  }

  const parsed = mobileSessionReviewFlagsSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      status: 502,
      message: SESSION_REVIEW_ALERTS_UNAVAILABLE,
    };
  }

  const appliedFilters = parsed.data.applied_filters;
  if (
    (appliedFilters?.school_type ?? null) !== expected.schoolType
    || (
      appliedFilters !== undefined
      && appliedFilters.school_id !== expected.schoolId
    )
  ) {
    return {
      ok: false,
      status: 502,
      message: SESSION_REVIEW_ALERTS_UNAVAILABLE,
    };
  }

  return { ok: true, data: parsed.data };
}
