import type { ProgrammeFidelityRow } from "./types";

function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildProgrammeFidelityCsv(rows: ProgrammeFidelityRow[]): string {
  const header = [
    "EA",
    "Group",
    "School",
    "Current owner",
    "Attention reason",
    "Observation",
    "Next mentor check",
    "Current advice",
    "Next letters",
    "Sessions in 14 days",
    "Last session date",
    "Tracker started",
    "Current roster",
    "Tracker coverage",
    "Alignment status",
    "Alignment score",
    "Aligned",
    "Below",
    "Above",
    "Unscored",
  ];
  const body = rows.map((row) => [
    row.ea_display_name,
    row.group_name,
    row.school_name,
    row.is_current_owner ? "Yes" : "No — former owner",
    row.reason.title,
    row.reason.observation,
    row.reason.recommended_check,
    row.is_current_owner ? row.advice_reason : null,
    row.is_current_owner ? row.introduce_letters?.join(" ") ?? null : null,
    row.recent_session_count,
    row.last_session_date,
    row.started_count,
    row.roster_size,
    row.tracker_coverage === null
      ? null
      : `${Math.round(row.tracker_coverage * 100)}%`,
    row.alignment_status,
    row.score,
    row.aligned_count,
    row.below_count,
    row.above_count,
    row.unscored_count,
  ]);
  return `\uFEFF${[header, ...body]
    .map((record) => record.map(csvCell).join(","))
    .join("\r\n")}\r\n`;
}
