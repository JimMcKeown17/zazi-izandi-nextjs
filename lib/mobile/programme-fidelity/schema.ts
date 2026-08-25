import { z } from "zod";

import type {
  ProgrammeFidelityFilters,
  ProgrammeFidelityResponse,
  ProgrammeFidelitySessionResponse,
} from "./types";

const canonicalUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const date = z.iso.date();
const timestamp = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative();
const nullableCount = count.nullable();
const boundedText = z.string().min(1).max(1000);
const letter = z.string().regex(/^[a-z]$/);
const DAY_MS = 86_400_000;
const epochDay = (value: string) => Date.parse(`${value}T00:00:00Z`) / DAY_MS;
const primaryReason = z.enum([
  "TEACHING_AHEAD_OF_FRONTIER",
  "RECENT_ACTIVITY_UNSCORABLE",
  "NO_RECENT_MOBILE_SESSION",
  "CURRENT_TRACKER_COVERAGE_LOW",
  "BOOTSTRAP_HISTORY_LIMITED",
  "UNKNOWN_LANGUAGE",
  "UNKNOWN_ASSESSMENT_FORM",
  "INVALID_SESSION_LETTERS",
  "SOURCE_DATA_INCOMPLETE",
  "NO_IMMEDIATE_FLAG",
]);
const instanceReason = z.enum([
  "PRE_LEDGER_NO_CAUSAL_HISTORY",
  "ALIGNMENT_NOT_YET_AVAILABLE",
  "PENDING_EVIDENCE_SETTLEMENT",
  "UNKNOWN_LANGUAGE",
  "UNKNOWN_ASSESSMENT_FORM",
  "SOURCE_DATA_INCOMPLETE",
  "INVALID_SESSION_LETTERS",
  "LOW_TRACKER_COVERAGE",
  "EMPTY_ROSTER",
]);
const dataQuality = z
  .object({
    invalid_session_letter_count: count,
    unknown_language_count: count,
    unknown_assessment_form_count: count,
    assessment_recency_tie_count: count,
    source_data_incomplete_count: count,
  })
  .strict();
const freshness = z
  .object({
    compute_completed_at: timestamp,
    source_generated_at: timestamp,
    last_failed_at: timestamp.nullable(),
    is_stale: z.boolean(),
  })
  .strict();

const rowSchema = z
  .object({
    group_id: canonicalUuid,
    ea_user_id: canonicalUuid,
    group_name: z.string().min(1).max(255),
    ea_display_name: z.string().min(1).max(255),
    school_id: canonicalUuid.nullable(),
    school_name: z.string().min(1).max(255).nullable(),
    school_type: z.string().min(1).max(64).nullable(),
    class_id: canonicalUuid.nullable(),
    class_name: z.string().min(1).max(255).nullable(),
    is_current_owner: z.boolean(),
    calculation_date: date,
    activity_date_from: date,
    activity_date_to: date,
    recent_session_count: count,
    last_session_date: date.nullable(),
    roster_size: nullableCount,
    started_count: nullableCount,
    tracker_coverage: z.number().min(0).max(1).nullable(),
    advice_reason: z
      .enum(["empty", "unknown_language", "day_one", "low_coverage", "terminal", "ok"])
      .nullable(),
    introduce_letters: z.array(letter).max(2).nullable(),
    primary_reason: primaryReason,
    reason: z
      .object({
        code: primaryReason,
        title: boundedText,
        observation: boundedText,
        recommended_check: boundedText,
      })
      .strict(),
    supporting_reasons: z.array(
      z
        .object({
          code: z.enum([
            "assessment_recency_tie",
            "invalid_assessment_items",
            "invalid_assessment_date",
            "invalid_correct_letters",
            "invalid_last_letter_attempted",
            "invalid_mastery_letter",
            "invalid_session_letters",
            "registry_lookup_failed",
            "unknown_assessment_form",
            "unknown_language",
          ]),
          observation: boundedText,
        })
        .strict()
    ),
    alignment_status: z.enum([
      "not_yet_available",
      "no_eligible_sessions",
      "partial",
      "scored",
    ]),
    data_quality_counts: dataQuality,
    alignment_scored_through_date: date.nullable(),
    aligned_count: nullableCount,
    below_count: nullableCount,
    above_count: nullableCount,
    unscored_count: nullableCount,
    scored_n: nullableCount,
    score: z.number().min(0).max(100).nullable(),
    causal_post_install_count: nullableCount,
    bootstrap_influenced_count: nullableCount,
    client_clock_count: nullableCount,
    server_clock_count: nullableCount,
    bootstrap_clock_count: nullableCount,
  })
  .strict()
  .superRefine((row, ctx) => {
    if (row.reason.code !== row.primary_reason) {
      ctx.addIssue({ code: "custom", message: "reason must match primary_reason" });
    }
    if (row.started_count !== null && row.roster_size !== null && row.started_count > row.roster_size) {
      ctx.addIssue({ code: "custom", message: "started_count exceeds roster_size" });
    }
    if (row.is_current_owner) {
      if (row.roster_size === null || row.started_count === null) {
        ctx.addIssue({ code: "custom", message: "current owner requires current coverage" });
      }
      if ((row.advice_reason === null) !== (row.introduce_letters === null)) {
        ctx.addIssue({ code: "custom", message: "current advice fields must travel together" });
      }
      if (
        row.advice_reason === null &&
        !["UNKNOWN_LANGUAGE", "UNKNOWN_ASSESSMENT_FORM", "SOURCE_DATA_INCOMPLETE"].includes(row.primary_reason)
      ) {
        ctx.addIssue({ code: "custom", message: "current advice may be withheld only for a closed reason" });
      }
    } else if (
      row.roster_size !== null ||
      row.started_count !== null ||
      row.tracker_coverage !== null ||
      row.advice_reason !== null ||
      row.introduce_letters !== null
    ) {
      ctx.addIssue({ code: "custom", message: "former owner cannot receive current advice" });
    }
    if (row.roster_size === 0 && row.tracker_coverage !== null) {
      ctx.addIssue({ code: "custom", message: "empty roster coverage must be null" });
    }
    if (row.roster_size !== null && row.roster_size > 0) {
      const expectedCoverage = (row.started_count ?? 0) / row.roster_size;
      if (row.tracker_coverage === null || Math.abs(row.tracker_coverage - expectedCoverage) > 1e-7) {
        ctx.addIssue({ code: "custom", message: "tracker coverage must reconcile" });
      }
    }
    if (
      (row.recent_session_count === 0 && row.last_session_date !== null) ||
      (row.recent_session_count > 0 && row.last_session_date === null)
    ) {
      ctx.addIssue({ code: "custom", message: "recent session date must reconcile" });
    }
    if (
      row.activity_date_to !== row.calculation_date ||
      epochDay(row.activity_date_to) - epochDay(row.activity_date_from) !== 13
    ) {
      ctx.addIssue({ code: "custom", message: "row activity window must be 14 dates through calculation day" });
    }
    const causal = [
      row.alignment_scored_through_date,
      row.aligned_count,
      row.below_count,
      row.above_count,
      row.unscored_count,
      row.scored_n,
      row.causal_post_install_count,
      row.bootstrap_influenced_count,
      row.client_clock_count,
      row.server_clock_count,
      row.bootstrap_clock_count,
    ];
    if (row.alignment_status === "not_yet_available") {
      if (causal.some((value) => value !== null) || row.score !== null) {
        ctx.addIssue({ code: "custom", message: "unavailable alignment must remain null" });
      }
    } else if (causal.some((value) => value === null)) {
      ctx.addIssue({ code: "custom", message: "available alignment requires counts" });
    }
    if (
      row.scored_n !== null &&
      row.aligned_count !== null &&
      row.below_count !== null &&
      row.above_count !== null &&
      row.scored_n !== row.aligned_count + row.below_count + row.above_count
    ) {
      ctx.addIssue({ code: "custom", message: "scored_n must match band counts" });
    }
    if (
      row.scored_n !== null &&
      ((row.scored_n === 0 && row.score !== null) ||
        (row.scored_n > 0 && row.score === null))
    ) {
      ctx.addIssue({ code: "custom", message: "score availability must match scored_n" });
    }
  });

export const programmeFidelitySchema = z
  .object({
    schema_version: z.literal(1),
    calculation_version: z.string().min(1).max(100),
    window_days: z.literal(14),
    activity_through_date: date.nullable(),
    alignment_scored_through_date: date.nullable(),
    alignment_availability: z
      .object({
        status: z.enum(["not_yet_available", "partial", "available"]),
        ledger_installed_at: timestamp,
        last_complete_event_run_finished_at: timestamp.nullable(),
        scored_through_date: date.nullable(),
        message: boundedText,
      })
      .strict(),
    applied_filters: z
      .object({
        school_id: canonicalUuid.nullable(),
        ea_user_id: canonicalUuid.nullable(),
        attention: z.enum(["all", "current", "above", "unscored", "inactive"]),
      })
      .strict(),
    freshness,
    history_quality: z
      .object({
        status: z.enum(["current_state_only", "causal_history_available"]),
        causal_session_count: nullableCount,
        bootstrap_influenced_count: nullableCount,
      })
      .strict(),
    aggregates: z
      .object({
        groups_needing_attention: count,
        active_groups: count,
        inactive_groups: count,
        tracker_started_count: count,
        tracker_roster_size: count,
        tracker_coverage: z.number().min(0).max(1).nullable(),
      })
      .strict(),
    data_quality: dataQuality.extend({ unattributed_session_count: count }).strict(),
    filter_options: z
      .object({
        schools: z.array(z.object({ id: canonicalUuid, name: z.string().min(1).max(255) }).strict()),
        eas: z.array(z.object({ id: canonicalUuid, name: z.string().min(1).max(255) }).strict()),
      })
      .strict(),
    rows: z.array(rowSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.alignment_availability.scored_through_date !== value.alignment_scored_through_date) {
      ctx.addIssue({ code: "custom", message: "alignment boundary mismatch" });
    }
    if (value.alignment_availability.status === "not_yet_available") {
      if (
        value.alignment_scored_through_date !== null ||
        value.alignment_availability.last_complete_event_run_finished_at !== null ||
        value.rows.some((row) => row.alignment_status !== "not_yet_available")
      ) {
        ctx.addIssue({ code: "custom", message: "unavailable alignment contains causal claims" });
      }
    } else if (
      value.alignment_scored_through_date === null ||
      value.alignment_availability.last_complete_event_run_finished_at === null
    ) {
      ctx.addIssue({ code: "custom", message: "available alignment requires a completed boundary" });
    }
    if (
      value.history_quality.status === "current_state_only" &&
      (value.history_quality.causal_session_count !== null ||
        value.history_quality.bootstrap_influenced_count !== null)
    ) {
      ctx.addIssue({ code: "custom", message: "current-state history summary must remain null" });
    }
    if (
      value.activity_through_date !== null &&
      value.rows.some((row) => row.activity_date_to !== value.activity_through_date)
    ) {
      ctx.addIssue({ code: "custom", message: "row activity boundary mismatch" });
    }

    const currentRows = value.rows.filter((row) => row.is_current_owner);
    const roster = currentRows.reduce((sum, row) => sum + (row.roster_size ?? 0), 0);
    const started = currentRows.reduce((sum, row) => sum + (row.started_count ?? 0), 0);
    const expectedAggregates = {
      groups_needing_attention: currentRows.filter((row) => row.primary_reason !== "NO_IMMEDIATE_FLAG").length,
      active_groups: currentRows.filter((row) => row.recent_session_count > 0).length,
      inactive_groups: currentRows.filter((row) => row.recent_session_count === 0).length,
      tracker_started_count: started,
      tracker_roster_size: roster,
      tracker_coverage: roster ? started / roster : null,
    };
    if (
      Object.entries(expectedAggregates).some(([key, expected]) => {
        const actual = value.aggregates[key as keyof typeof expectedAggregates];
        return typeof expected === "number" && typeof actual === "number"
          ? Math.abs(actual - expected) > 1e-7
          : actual !== expected;
      })
    ) {
      ctx.addIssue({ code: "custom", message: "summary tiles must reconcile with current-owner rows" });
    }

    for (const key of [
      "invalid_session_letter_count",
      "unknown_language_count",
      "unknown_assessment_form_count",
      "assessment_recency_tie_count",
      "source_data_incomplete_count",
    ] as const) {
      const expected = value.rows.reduce((sum, row) => sum + row.data_quality_counts[key], 0);
      if (value.data_quality[key] !== expected) {
        ctx.addIssue({ code: "custom", message: `data quality ${key} must reconcile` });
      }
    }
  }) as z.ZodType<ProgrammeFidelityResponse>;

const sessionSchema = z
  .object({
    session_id: canonicalUuid,
    session_date: date,
    session_time_quality: z.enum(["started_at", "date_fallback"]),
    alignment_status: z.enum(["pre_ledger", "not_yet_available", "pending_settlement", "evaluated"]),
    reason_code: instanceReason,
    historical_frontier: z.array(letter).max(2).nullable(),
    historical_roster_size: nullableCount,
    historical_started_count: nullableCount,
    history_quality: z.enum(["causal_post_install", "bootstrap_influenced"]).nullable(),
    clock_quality_counts: z
      .object({
        client: count,
        server: count,
        bootstrap: count,
      })
      .strict()
      .nullable(),
    letters: z.array(
      z
        .object({
          letter,
          band: z.enum(["aligned", "below", "above", "unscored", "pending"]),
        })
        .strict()
    ),
  })
  .strict()
  .superRefine((value, ctx) => {
    const historicalValues = [
      value.historical_roster_size,
      value.historical_started_count,
      value.history_quality,
      value.clock_quality_counts,
    ];
    if (value.alignment_status === "evaluated") {
      if (historicalValues.some((item) => item === null)) {
        ctx.addIssue({ code: "custom", message: "evaluated sessions require historical evidence" });
      }
    } else if (value.historical_frontier !== null || historicalValues.some((item) => item !== null)) {
      ctx.addIssue({ code: "custom", message: "unevaluated sessions cannot claim historical evidence" });
    }
  });

export const programmeFidelitySessionsSchema = z
  .object({
    schema_version: z.literal(1),
    calculation_version: z.string().min(1).max(100),
    window_days: z.literal(14),
    applied_filters: z
      .object({
        group_id: canonicalUuid,
        ea_user_id: canonicalUuid,
        window_days: z.literal(14),
        activity_date_from: date,
        activity_date_to: date,
        alignment_date_from: date,
        alignment_date_to: date,
        union_date_from: date,
        union_date_to: date,
      })
      .strict(),
    freshness,
    sessions: z.array(sessionSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    const applied = value.applied_filters;
    if (
      epochDay(applied.activity_date_to) - epochDay(applied.activity_date_from) !== 13 ||
      epochDay(applied.alignment_date_to) - epochDay(applied.alignment_date_from) !== 13 ||
      epochDay(applied.activity_date_from) - epochDay(applied.alignment_date_from) !== 1 ||
      epochDay(applied.activity_date_to) - epochDay(applied.alignment_date_to) !== 1 ||
      applied.union_date_from !== applied.alignment_date_from ||
      applied.union_date_to !== applied.activity_date_to
    ) {
      ctx.addIssue({ code: "custom", message: "session explanation windows do not reconcile" });
    }
    const unionFrom = epochDay(applied.union_date_from);
    const unionTo = epochDay(applied.union_date_to);
    if (value.sessions.some((session) => {
      const sessionDay = epochDay(session.session_date);
      return sessionDay < unionFrom || sessionDay > unionTo;
    })) {
      ctx.addIssue({ code: "custom", message: "session falls outside the bounded union" });
    }
  }) as z.ZodType<ProgrammeFidelitySessionResponse>;

export function aggregateResponseMatchesRequest(
  response: ProgrammeFidelityResponse,
  filters: ProgrammeFidelityFilters
): boolean {
  return (
    response.window_days === 14 &&
    response.applied_filters.school_id === filters.schoolId &&
    response.applied_filters.ea_user_id === filters.eaUserId &&
    response.applied_filters.attention === filters.attention
  );
}

export function sessionsResponseMatchesRequest(
  response: ProgrammeFidelitySessionResponse,
  ids: { groupId: string; eaUserId: string }
): boolean {
  const applied = response.applied_filters;
  return (
    response.window_days === 14 &&
    applied.window_days === 14 &&
    applied.group_id === ids.groupId &&
    applied.ea_user_id === ids.eaUserId &&
    applied.union_date_from === applied.alignment_date_from &&
    applied.union_date_to === applied.activity_date_to
  );
}
