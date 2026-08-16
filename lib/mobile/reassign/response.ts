import { z } from "zod";

import type {
  MobileHandoverJobResponse,
  MobileReassignErrorCode,
  MobileReassignResult,
  MobileReassignRosterPreview,
} from "./types";

const uuid = z.string().uuid();
const entityKind = z.enum(["class", "group", "child"]);
const scope = z.enum(["roster", "class"]);
const refusalCode = z.enum([
  "target_name_collision",
  "shared_class_unsupported",
  "entity_archived",
  "no_current_holder",
  "claimant_ambiguous",
  "cas_conflict",
  "no_active_assignment",
  "group_class_holder_mismatch",
  "entity_not_found",
  "target_ea_not_found",
  "seed_lease_busy",
  "request_id_reuse_mismatch",
  "from_equals_to",
  "timeout",
  "upstream_unavailable",
  "parent_stale_veto",
  "operator_left_behind",
  "malformed_wrapper_result",
]);

const rosterEntity = z
  .object({
    entity_kind: entityKind,
    entity_id: uuid,
    name: z.string(),
    parent_class_id: uuid.nullable(),
    expected_assignment_id: uuid.nullable(),
    source: z.enum(["ledger", "scalar_only"]),
  })
  .strict();

const unresolvedEntity = rosterEntity.extend({
  reason: z.enum(["parent_misaligned", "class_membership_orphan"]),
});

const rosterPreviewSchema = z
  .object({
    from_ea: uuid,
    from_ea_name: z.string(),
    scope,
    scope_class_id: uuid.nullable(),
    classes: z.array(rosterEntity),
    groups: z.array(rosterEntity),
    children: z.array(rosterEntity),
    scalar_only: z.array(rosterEntity),
    unresolved: z.array(unresolvedEntity),
    source_counts: z
      .object({
        class_ledger_active: z.number().int().nonnegative(),
        group_ledger_active: z.number().int().nonnegative(),
        child_ledger_active: z.number().int().nonnegative(),
        scalar_class_rows: z.number().int().nonnegative(),
        scalar_group_rows: z.number().int().nonnegative(),
      })
      .strict(),
    counts: z
      .object({
        classes: z.number().int().nonnegative(),
        groups: z.number().int().nonnegative(),
        children: z.number().int().nonnegative(),
        scalar_only: z.number().int().nonnegative(),
        unresolved: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const actual = {
      classes: value.classes.length,
      groups: value.groups.length,
      children: value.children.length,
      scalar_only: value.scalar_only.length,
      unresolved: value.unresolved.length,
    };
    for (const [key, count] of Object.entries(actual)) {
      if (value.counts[key as keyof typeof value.counts] !== count) {
        context.addIssue({ code: "custom", message: `${key} count does not match its list` });
      }
    }
    if ((value.scope === "class") !== Boolean(value.scope_class_id)) {
      context.addIssue({ code: "custom", message: "scope and scope_class_id disagree" });
    }
  });

const jobResponseSchema = z
  .object({
    job: z
      .object({
        id: uuid,
        status: z.enum([
          "created",
          "running",
          "complete",
          "complete_with_refusals",
          "complete_with_exclusions",
          "needs_repreview",
          "integrity_fault",
        ]),
        retryable: z.boolean(),
        in_flight: z.boolean(),
        scope,
        scope_class_id: uuid.nullable(),
        from_ea_user_id: uuid,
        to_ea_user_id: uuid,
        reason: z.string().min(1).max(200),
        requested_by: z
          .object({ clerk_user_id: z.string().min(1), email: z.string() })
          .strict(),
        progress_cursor: z.number().int().min(-1),
        total_items: z.number().int().nonnegative(),
        created_at: z.string().min(1).nullable(),
        updated_at: z.string().min(1).nullable(),
        summary: z.string(),
      })
      .strict(),
    items: z.array(
      z
        .object({
          position: z.number().int().nonnegative(),
          entity_kind: entityKind,
          entity_id: uuid,
          parent_class_id: uuid.nullable(),
          state: z.enum(["pending", "transferred", "refused", "stale", "error", "excluded"]),
          refusal_code: z.union([refusalCode, z.literal("")]),
          message: z.string(),
          expected_assignment_id: uuid.nullable(),
          remaining_foreign_claims: z.number().int().nonnegative().nullable(),
          result: z.record(z.string(), z.unknown()),
        })
        .strict()
    ),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.job.scope === "class") !== Boolean(value.job.scope_class_id)) {
      context.addIssue({ code: "custom", message: "job scope and scope_class_id disagree" });
    }
    if (value.job.total_items !== value.items.length) {
      context.addIssue({ code: "custom", message: "total_items does not match items" });
    }
    const seen = new Set<number>();
    for (const item of value.items) {
      if (seen.has(item.position)) context.addIssue({ code: "custom", message: "duplicate item position" });
      seen.add(item.position);
    }
    if (value.job.status === "complete" || value.job.status.startsWith("complete_")) {
      if (value.job.retryable || value.job.in_flight) {
        context.addIssue({ code: "custom", message: "terminal completion cannot be retryable or in flight" });
      }
    }
  });

const ERROR_CODES_BY_STATUS: Record<number, readonly MobileReassignErrorCode[]> = {
  400: ["invalid_handover_request", "unresolved_decisions_required", "successor_not_eligible"],
  404: ["handover_job_not_found"],
  409: ["handover_lease_busy", "handover_job_already_active", "integrity_fault"],
  422: ["scope_class_not_owned"],
  502: ["mobile_handover_unavailable", "mobile_handover_roster_too_large"],
  504: ["mobile_handover_timeout"],
};

const errorEnvelopeSchema = z.object({ error: z.string(), code: z.string().optional() }).passthrough();

function malformed(status: number, message = "The roster handover service returned an unexpected format.") {
  return { ok: false as const, status, code: "malformed_response" as const, message };
}

async function decodeError(response: Response): Promise<MobileReassignResult<never>> {
  const knownCodes = ERROR_CODES_BY_STATUS[response.status];
  if (!knownCodes) return malformed(response.status, "The roster handover service returned an unexpected response.");
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return malformed(response.status);
  }
  const parsed = errorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) return malformed(response.status);
  const code =
    response.status === 404 && parsed.data.code === undefined
      ? "handover_job_not_found"
      : parsed.data.code;
  if (!code || !knownCodes.includes(code as MobileReassignErrorCode)) {
    return malformed(response.status, "The roster handover service returned an unexpected error code.");
  }
  return { ok: false, status: response.status, code: code as MobileReassignErrorCode, message: parsed.data.error };
}

async function decode<T>(response: Response, schema: z.ZodType<T>): Promise<MobileReassignResult<T>> {
  if (!response.ok) return decodeError(response);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return malformed(502);
  }
  const parsed = schema.safeParse(payload);
  return parsed.success ? { ok: true, data: parsed.data } : malformed(502);
}

export function decodeMobileReassignRosterResponse(response: Response): Promise<MobileReassignResult<MobileReassignRosterPreview>> {
  return decode(response, rosterPreviewSchema);
}

export function decodeMobileReassignJobResponse(response: Response): Promise<MobileReassignResult<MobileHandoverJobResponse>> {
  return decode(response, jobResponseSchema);
}
