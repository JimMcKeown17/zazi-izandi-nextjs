import { createHash } from "node:crypto";
import { z } from "zod";

import { timestampMicros } from "./timestamps";
import type { MobileSyncIncidentFilters } from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const DESCRIPTOR_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
const VERSION_PATTERN = /^[A-Za-z0-9_.+()-]{1,128}$/;
const DEVICE_MODEL_PATTERN = /^[A-Za-z0-9 ._()+/-]{1,128}$/;
const DEVICE_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CONTROL_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
const ASCII_CURSOR_PATTERN = /^[\x20-\x7e]{1,2048}$/;
const PROHIBITED_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
const ACK_INTEGRITY_REASONS = new Set([
  "rpc_rejected",
  "ack_malformed",
  "ack_identity_mismatch",
]);
const PULL_INTEGRITY_REASONS = new Set([
  "pull_drop_deferred",
  "pull_drop_quarantined",
]);
const PULL_PRODUCERS = new Set(["merge_server_rows", "child_revocation"]);

const canonicalUuid = z.string().regex(UUID_PATTERN);
const safeCount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positiveSafeCount = safeCount.min(1);
const descriptor = z.string().regex(DESCRIPTOR_PATTERN);
const token = z.string().regex(TOKEN_PATTERN);
const id = z.string().regex(ID_PATTERN);
const version = z.string().regex(VERSION_PATTERN);

function trimAsciiSpaces(value: string): string {
  return value.replace(/^ +| +$/g, "");
}

export function isBoundedSafeText(
  value: string,
  options: { maxCodePoints: number; maxUtf8Bytes: number; rejectAt: boolean }
): boolean {
  return (
    value === trimAsciiSpaces(value) &&
    Array.from(value).length >= 1 &&
    Array.from(value).length <= options.maxCodePoints &&
    new TextEncoder().encode(value).length <= options.maxUtf8Bytes &&
    !PROHIBITED_TEXT_PATTERN.test(value) &&
    (!options.rejectAt || !value.includes("@"))
  );
}

export function normalizeActorTextCandidate(
  value: string,
  kind: "display_name" | "school_name"
): string | null {
  const normalized = trimAsciiSpaces(value);
  const valid = isBoundedSafeText(
    normalized,
    kind === "display_name"
      ? { maxCodePoints: 128, maxUtf8Bytes: 512, rejectAt: true }
      : { maxCodePoints: 160, maxUtf8Bytes: 640, rejectAt: false }
  );
  return valid ? normalized : null;
}

/**
 * Contract-test mirror only. Production browser responses already contain the
 * display name selected and validated by Django; the browser never receives
 * raw roster or identity candidates. Keeping this mirror lets the byte-pinned
 * SQL/Python/TypeScript corpus detect cross-repository projection drift.
 */
export function selectActorDisplayName(
  actorUserId: string,
  candidates: {
    rosterDisplayName: string | null;
    identityDisplayName: string | null;
    rosterFirstName: string | null;
    rosterLastName: string | null;
    identityFirstName: string | null;
    identityLastName: string | null;
  }
): { displayName: string; source: "roster" | "identity" | "uuid" } {
  const joinedName = (first: string | null, last: string | null): string =>
    [first?.replace(/^ +| +$/g, ""), last?.replace(/^ +| +$/g, "")]
      .filter((value): value is string => Boolean(value))
      .join(" ");
  const ordered = [
    [candidates.rosterDisplayName, "roster"],
    [candidates.identityDisplayName, "identity"],
    [joinedName(candidates.rosterFirstName, candidates.rosterLastName), "roster"],
    [
      joinedName(candidates.identityFirstName, candidates.identityLastName),
      "identity",
    ],
  ] as const;
  for (const [candidate, source] of ordered) {
    if (candidate === null) continue;
    const normalized = normalizeActorTextCandidate(candidate, "display_name");
    if (normalized !== null) return { displayName: normalized, source };
  }
  return { displayName: actorUserId, source: "uuid" };
}

const displayName = z.string().refine(
  (value) => normalizeActorTextCandidate(value, "display_name") === value,
  "display_name is not bounded safe text"
);
const schoolName = z.string().refine(
  (value) => normalizeActorTextCandidate(value, "school_name") === value,
  "current_school is not bounded safe text"
);

function validTimestamp(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(
    value
  );
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match;
  const parsed = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  );
  return (
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day) &&
    parsed.getUTCHours() === Number(hour) &&
    parsed.getUTCMinutes() === Number(minute) &&
    parsed.getUTCSeconds() === Number(second)
  );
}

const deviceTimestamp = z
  .string()
  .regex(DEVICE_TIMESTAMP_PATTERN)
  .refine(validTimestamp);
const controlTimestamp = z
  .string()
  .regex(CONTROL_TIMESTAMP_PATTERN)
  .refine(validTimestamp);

const actorSchema = z
  .strictObject({
    user_id: canonicalUuid,
    display_name: displayName,
    display_name_source: z.enum(["roster", "identity", "uuid"]),
    current_school_id: canonicalUuid.nullable(),
    current_school: schoolName.nullable(),
  })
  .superRefine((actor, context) => {
    if (
      actor.display_name_source === "uuid" &&
      actor.display_name !== actor.user_id
    ) {
      context.addIssue({
        code: "custom",
        path: ["display_name"],
        message: "UUID fallback must equal the actor UUID",
      });
    }
    if (actor.current_school_id === null && actor.current_school !== null) {
      context.addIssue({
        code: "custom",
        path: ["current_school"],
        message: "a school name requires a school id",
      });
    }
  });

const receiptShapeSchema = z
  .strictObject({
    actor_user_id: canonicalUuid,
    incident_key: z.string().min(1).max(512),
    incident_kind: z.enum([
      "support_root",
      "integrity_aggregate",
      "queue_overflow",
    ]),
    descriptor_key: descriptor.nullable(),
    local_record_id: id.nullable(),
    mutation_id: canonicalUuid.nullable(),
    client_stream_id: canonicalUuid.nullable(),
    client_generation: safeCount,
    audit_sequence: safeCount,
    operation: z
      .enum(["insert", "update", "archive", "hard_delete", "restore"])
      .nullable(),
    source_status: z.enum(["support_needed", "terminal"]).nullable(),
    attempt_count: safeCount,
    uncertain_attempt_count: safeCount,
    error_class: z.enum([
      "row",
      "transport",
      "service",
      "unknown",
      "auth",
      "rejected_deterministic",
      "malformed",
      "integrity",
      "queue",
    ]),
    error_code: token.nullable(),
    reason: z
      .enum([
        "audit_zero_unsynced",
        "missing_outbox_slot",
        "missing_domain_row",
        "invalid_upload_identity",
        "domain_newer_than_outbox",
        "rpc_rejected",
        "ack_malformed",
        "ack_identity_mismatch",
        "pull_drop_deferred",
        "pull_drop_quarantined",
      ])
      .nullable(),
    detail_kind: token.nullable(),
    detail_code: token.nullable(),
    first_seen_at: deviceTimestamp,
    last_seen_at: deviceTimestamp,
    occurrence_count: positiveSafeCount,
    app_version: version.nullable(),
    build_number: version.nullable(),
    runtime_version: version.nullable(),
    platform: z.enum(["android", "ios", "web", "unknown"]),
    os_version: version.nullable(),
    device_model: z.string().regex(DEVICE_MODEL_PATTERN).nullable(),
    payload_sha256: z.string().regex(SHA256_PATTERN),
    received_at: controlTimestamp,
  })
  .superRefine((receipt, context) => {
    if (receipt.incident_kind === "support_root") {
      if (
        receipt.mutation_id === null ||
        receipt.incident_key !== `support:v1:${receipt.mutation_id}` ||
        receipt.local_record_id === null ||
        receipt.client_stream_id === null ||
        receipt.operation === null ||
        receipt.source_status === null ||
        receipt.reason !== null ||
        receipt.detail_kind !== null ||
        receipt.detail_code !== null
      ) {
        context.addIssue({
          code: "custom",
          path: ["incident_kind"],
          message: "support_root shape is invalid",
        });
      }
      return;
    }

    if (receipt.incident_kind === "integrity_aggregate") {
      if ((receipt as typeof receipt & { schema_version?: number }).schema_version === 3) {
        return;
      }
      if (
        !/^integrity:v1:[0-9a-f]{64}$/.test(receipt.incident_key) ||
        receipt.mutation_id !== null ||
        receipt.client_stream_id !== null ||
        receipt.operation !== null ||
        receipt.source_status !== null ||
        receipt.reason === null
      ) {
        context.addIssue({
          code: "custom",
          path: ["incident_kind"],
          message: "integrity_aggregate shape is invalid",
        });
      }
      return;
    }

    if (
      receipt.incident_key !== "overflow:v1" ||
      receipt.descriptor_key !== null ||
      receipt.local_record_id !== null ||
      receipt.mutation_id !== null ||
      receipt.client_stream_id !== null ||
      receipt.operation !== null ||
      receipt.source_status !== null ||
      receipt.reason !== null ||
      receipt.detail_kind !== null ||
      receipt.detail_code !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["incident_kind"],
        message: "queue_overflow shape is invalid",
      });
    }
  });

const receiptSchema = receiptShapeSchema.safeExtend({
  schema_version: z.literal(1),
});

const receiptV2Schema = receiptShapeSchema
  .safeExtend({
    schema_version: z.literal(2),
    observed_release_label: version.nullable(),
    observed_update_id: canonicalUuid.nullable(),
    observed_is_embedded_launch: z.boolean().nullable(),
  })
  .superRefine((receipt, context) => {
    if (
      receipt.observed_is_embedded_launch === null &&
      (receipt.observed_release_label !== null ||
        receipt.observed_update_id !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["observed_is_embedded_launch"],
        message: "unknown launch identity cannot claim release provenance",
      });
    }
    if (
      receipt.observed_is_embedded_launch === true &&
      receipt.observed_update_id !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["observed_update_id"],
        message: "an embedded launch cannot claim an OTA update UUID",
      });
    }
  });

const conditionKey = z
  .string()
  .max(512)
  .regex(
    /^integrity-condition:v2\|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\|[A-Z][A-Z0-9_]{0,63}\|[A-Za-z0-9_.:-]{1,128}\|[A-Za-z0-9_.:-]{1,128}\|[A-Za-z0-9_.:-]{0,128}$/
  );

const receiptV3Schema = receiptV2Schema
  .safeExtend({
    schema_version: z.literal(3),
    incident_kind: z.literal("integrity_aggregate"),
    descriptor_key: descriptor,
    local_record_id: z.null(),
    mutation_id: z.null(),
    client_stream_id: canonicalUuid,
    operation: z.null(),
    source_status: z.null(),
    reason: z.enum([
      "rpc_rejected",
      "ack_malformed",
      "ack_identity_mismatch",
      "pull_drop_deferred",
      "pull_drop_quarantined",
    ]),
    detail_kind: token,
    condition_key: conditionKey,
    report_generation: positiveSafeCount,
    affected_record_count: positiveSafeCount,
  })
  .superRefine((receipt, context) => {
    const expectedCondition = [
      "integrity-condition:v2",
      receipt.client_stream_id,
      receipt.descriptor_key,
      receipt.reason,
      receipt.detail_kind,
      receipt.detail_code ?? "",
    ].join("|");
    const expectedKey = `integrity:v3:${createHash("sha256")
      .update(receipt.condition_key, "ascii")
      .digest("hex")}:${receipt.report_generation}`;
    if (
      receipt.condition_key !== expectedCondition ||
      receipt.incident_key !== expectedKey ||
      (ACK_INTEGRITY_REASONS.has(receipt.reason) &&
        receipt.detail_code === null) ||
      (PULL_INTEGRITY_REASONS.has(receipt.reason) &&
        (!PULL_PRODUCERS.has(receipt.detail_kind) ||
          receipt.detail_code !== null))
    ) {
      context.addIssue({
        code: "custom",
        path: ["condition_key"],
        message: "schema-3 condition identity is invalid",
      });
    }
  });

const itemSchema = z.strictObject({
  actor: actorSchema,
  receipt: receiptSchema,
});

const itemV2Schema = z.strictObject({
  actor: actorSchema,
  receipt: z.discriminatedUnion("schema_version", [
    receiptSchema,
    receiptV2Schema,
    receiptV3Schema,
  ]),
});

const appliedFiltersSchema = z.strictObject({
  days: z.number().int().min(1).max(90),
  start_at: controlTimestamp,
  end_at: controlTimestamp,
  snapshot_received_before: controlTimestamp,
  school_id: canonicalUuid.nullable(),
  actor_user_id: z.null(),
  incident_kind: z
    .enum(["support_root", "integrity_aggregate", "queue_overflow"])
    .nullable(),
  descriptor_key: descriptor.nullable(),
  limit: z.number().int().min(1).max(100),
});

const summarySchema = z.strictObject({
  receipts: safeCount,
  affected_users: safeCount,
  support_roots: safeCount,
  integrity_findings: safeCount,
  coverage_constrained: safeCount,
  newest_received_at: controlTimestamp.nullable(),
});

const successorSummarySchema = z.strictObject({
  receipts: safeCount,
  affected_users: safeCount,
  support_roots: safeCount,
  legacy_receipts: safeCount,
  effective_v3_conditions: safeCount,
  coverage_constrained: safeCount,
  newest_received_at: controlTimestamp.nullable(),
});

const transitionSummarySchema = z.union([
  summarySchema,
  successorSummarySchema,
]);

function expectedSastWindow(snapshot: string, days: number): {
  start: bigint;
  end: bigint;
} {
  const sastCalendar = new Date(Date.parse(snapshot) + 2 * 60 * 60 * 1000);
  const year = sastCalendar.getUTCFullYear();
  const month = sastCalendar.getUTCMonth();
  const day = sastCalendar.getUTCDate();
  const startMillis = Date.UTC(year, month, day - (days - 1), -2, 0, 0);
  const endMillis = Date.UTC(year, month, day + 1, -2, 0, 0);
  return {
    start: BigInt(startMillis) * BigInt(1000),
    end: BigInt(endMillis) * BigInt(1000),
  };
}

const mobileSyncIncidentsCommonSchema = z.strictObject({
  generated_at: controlTimestamp,
  applied_filters: appliedFiltersSchema,
  summary: summarySchema,
  page_count: safeCount,
  next_cursor: z.string().regex(ASCII_CURSOR_PATTERN).nullable(),
});

const mobileSyncIncidentsV1UnrefinedSchema =
  mobileSyncIncidentsCommonSchema.safeExtend({
    schema_version: z.literal(1),
    incidents: z.array(itemSchema).max(100),
  });

const mobileSyncIncidentsV2UnrefinedSchema =
  mobileSyncIncidentsCommonSchema.safeExtend({
    schema_version: z.literal(2),
    summary: transitionSummarySchema,
    incidents: z.array(itemV2Schema).max(100),
  });

type MobileSyncIncidentsRefinementValue = Omit<
  z.infer<typeof mobileSyncIncidentsV2UnrefinedSchema>,
  "schema_version"
>;

function refineMobileSyncIncidents(
  value: MobileSyncIncidentsRefinementValue,
  context: z.RefinementCtx
): void {
  const { summary, incidents, applied_filters: filters } = value;
  const integrityTotal =
    "integrity_findings" in summary
      ? summary.integrity_findings
      : summary.legacy_receipts + summary.effective_v3_conditions;
    const expectedWindow = expectedSastWindow(
      filters.snapshot_received_before,
      filters.days
    );
    if (
      timestampMicros(filters.start_at) !== expectedWindow.start ||
      timestampMicros(filters.end_at) !== expectedWindow.end ||
      timestampMicros(filters.snapshot_received_before) >
        timestampMicros(value.generated_at)
    ) {
      context.addIssue({
        code: "custom",
        path: ["applied_filters"],
        message: "applied filters do not match the snapshot SAST window",
      });
    }
    if (
      summary.support_roots +
        integrityTotal +
        summary.coverage_constrained !==
      summary.receipts
    ) {
      context.addIssue({
        code: "custom",
        path: ["summary"],
        message: "kind totals must sum to receipts",
      });
    }
    if (
      summary.affected_users > summary.receipts ||
      value.page_count !== incidents.length ||
      value.page_count > filters.limit ||
      summary.receipts < incidents.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["summary"],
        message: "summary and page counts are inconsistent",
      });
    }

    const actorIds = new Set<string>();
    const identities = new Set<string>();
    const pageKindCounts = {
      support_root: 0,
      integrity_aggregate: 0,
      queue_overflow: 0,
    };
    incidents.forEach((item, index) => {
      actorIds.add(item.actor.user_id);
      pageKindCounts[item.receipt.incident_kind] += 1;
      const identity = `${item.receipt.actor_user_id}\u0000${item.receipt.incident_key}`;
      if (identities.has(identity)) {
        context.addIssue({
          code: "custom",
          path: ["incidents", index],
          message: "incident identities must be unique",
        });
      }
      identities.add(identity);

      if (item.actor.user_id !== item.receipt.actor_user_id) {
        context.addIssue({
          code: "custom",
          path: ["incidents", index, "actor", "user_id"],
          message: "actor and receipt UUIDs must match",
        });
      }
      if (
        filters.school_id !== null &&
        item.actor.current_school_id !== filters.school_id
      ) {
        context.addIssue({
          code: "custom",
          path: ["incidents", index, "actor", "current_school_id"],
          message: "selected-school rows must match the current school",
        });
      }
      if (
        filters.incident_kind !== null &&
        item.receipt.incident_kind !== filters.incident_kind
      ) {
        context.addIssue({
          code: "custom",
          path: ["incidents", index, "receipt", "incident_kind"],
          message: "incident kind must match the applied filter",
        });
      }
      if (
        filters.descriptor_key !== null &&
        item.receipt.descriptor_key !== filters.descriptor_key
      ) {
        context.addIssue({
          code: "custom",
          path: ["incidents", index, "receipt", "descriptor_key"],
          message: "descriptor must match the applied filter",
        });
      }

      const received = timestampMicros(item.receipt.received_at);
      if (
        received < timestampMicros(filters.start_at) ||
        received >= timestampMicros(filters.end_at) ||
        received > timestampMicros(filters.snapshot_received_before)
      ) {
        context.addIssue({
          code: "custom",
          path: ["incidents", index, "receipt", "received_at"],
          message: "receipt is outside the applied snapshot window",
        });
      }

      if (index > 0) {
        const previous = incidents[index - 1].receipt;
        const previousTime = timestampMicros(previous.received_at);
        const currentTime = timestampMicros(item.receipt.received_at);
        const wrongOrder =
          previousTime < currentTime ||
          (previousTime === currentTime &&
            (previous.actor_user_id < item.receipt.actor_user_id ||
              (previous.actor_user_id === item.receipt.actor_user_id &&
                previous.incident_key < item.receipt.incident_key)));
        if (wrongOrder) {
          context.addIssue({
            code: "custom",
            path: ["incidents", index],
            message: "incidents must retain deterministic descending order",
          });
        }
      }
    });

    if (summary.affected_users < actorIds.size) {
      context.addIssue({
        code: "custom",
        path: ["summary", "affected_users"],
        message: "summary must cover every page actor",
      });
    }
    if (
      pageKindCounts.support_root > summary.support_roots ||
      pageKindCounts.integrity_aggregate > integrityTotal ||
      pageKindCounts.queue_overflow > summary.coverage_constrained
    ) {
      context.addIssue({
        code: "custom",
        path: ["summary"],
        message: "page kind counts cannot exceed the summary",
      });
    }
    if ((summary.receipts === 0) !== (summary.newest_received_at === null)) {
      context.addIssue({
        code: "custom",
        path: ["summary", "newest_received_at"],
        message: "newest receipt nullability must match the summary",
      });
    }
    if (summary.receipts === 0) {
      if (
        summary.affected_users !== 0 ||
        summary.support_roots !== 0 ||
        integrityTotal !== 0 ||
        summary.coverage_constrained !== 0 ||
        incidents.length !== 0 ||
        value.next_cursor !== null
      ) {
        context.addIssue({
          code: "custom",
          path: ["summary"],
          message: "zero summary shape is invalid",
        });
      }
    }
    if (value.next_cursor !== null && value.page_count !== filters.limit) {
      context.addIssue({
        code: "custom",
        path: ["next_cursor"],
        message: "a cursor requires a full page",
      });
    }
}

export const mobileSyncIncidentsSchema =
  mobileSyncIncidentsV1UnrefinedSchema.superRefine(refineMobileSyncIncidents);

export const mobileSyncIncidentsV2Schema =
  mobileSyncIncidentsV2UnrefinedSchema.superRefine(refineMobileSyncIncidents);

export function responseMatchesRequest(
  response:
    | z.infer<typeof mobileSyncIncidentsSchema>
    | z.infer<typeof mobileSyncIncidentsV2Schema>,
  requestedFilters: MobileSyncIncidentFilters
): boolean {
  const expected = {
    days: requestedFilters.days,
    school_id: requestedFilters.schoolId ?? null,
    incident_kind: requestedFilters.incidentKind ?? null,
    descriptor_key: requestedFilters.descriptorKey ?? null,
    limit: requestedFilters.limit,
  };
  const applied = response.applied_filters;
  if (
    applied.days !== expected.days ||
    applied.school_id !== expected.school_id ||
    applied.actor_user_id !== null ||
    applied.incident_kind !== expected.incident_kind ||
    applied.descriptor_key !== expected.descriptor_key ||
    applied.limit !== expected.limit
  ) {
    return false;
  }

  if (
    requestedFilters.cursor != null &&
    response.next_cursor === requestedFilters.cursor
  ) {
    return false;
  }

  if (requestedFilters.cursor == null && response.summary.receipts > 0) {
    if (
      response.incidents.length === 0 ||
      response.summary.newest_received_at !==
        response.incidents[0].receipt.received_at
    ) {
      return false;
    }
    if (response.summary.receipts <= applied.limit) {
      return (
        response.page_count === response.summary.receipts &&
        response.next_cursor === null
      );
    }
    return (
      response.page_count === applied.limit && response.next_cursor !== null
    );
  }
  return true;
}
