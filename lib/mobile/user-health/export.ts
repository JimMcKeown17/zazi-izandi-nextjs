import { getEmploymentStatusDisplay } from "../presentation";
import {
  ATTENTION_LABELS,
  getActivityStage,
  getUserAttentionReasons,
} from "./presentation";
import type { MobileUserHealthRow } from "./types";

function csvCell(value: string | null): string {
  const raw = value ?? "";
  const guarded = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replaceAll('"', '""')}"`;
}

function describeBlockers(user: MobileUserHealthRow): string {
  return getUserAttentionReasons(user)
    .map((reason) => ATTENTION_LABELS[reason])
    .join("; ");
}

export interface ChaseListContext {
  days: number;
  generatedAt: string;
  schoolId: string | null;
  schoolName: string | null;
}

export function buildChaseListCsv(
  rows: MobileUserHealthRow[],
  context: ChaseListContext
): string {
  const header = [
    "name",
    "email",
    "current_school",
    "employment_status",
    "status_in_window",
    "blockers",
    "last_activity_at",
    "activity_window_days",
    "generated_at",
    "scope_school_id",
    "scope_school_name",
    "user_id",
  ]
    .map(csvCell)
    .join(",");
  const lines = rows.map((user) =>
    [
      user.display_name,
      user.email,
      user.current_school,
      user.employment_status,
      getActivityStage(user),
      describeBlockers(user),
      user.activity.last_activity_at,
      String(context.days),
      context.generatedAt,
      context.schoolId ?? "all",
      context.schoolName ?? "all schools",
      user.user_id,
    ]
      .map(csvCell)
      .join(",")
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}

export function buildChaseListText(
  rows: MobileUserHealthRow[],
  context: ChaseListContext
): string {
  const scope = context.schoolName ?? "all schools";
  const header = `User health chase list · last ${context.days} days · ${scope} · generated ${context.generatedAt}`;
  const lines = rows.map((user) => {
    const stage = `${getActivityStage(user)} · ${context.days}d`;
    const blockers = describeBlockers(user);
    const status =
      blockers.length > 0 ? `${stage} — blockers: ${blockers}` : stage;
    const employment = getEmploymentStatusDisplay(user.employment_status);
    const name =
      employment && employment.kind !== "active"
        ? `${user.display_name} (${employment.label})`
        : user.display_name;
    return `${name} — ${status} — ${user.current_school}`;
  });
  return [header, ...lines].join("\n");
}
