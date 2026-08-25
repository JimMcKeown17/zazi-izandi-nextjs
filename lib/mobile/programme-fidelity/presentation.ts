import type {
  ProgrammeFidelityExpansion,
  ProgrammeFidelityFilters,
  ProgrammeFidelityRow,
} from "./types";

export function formatCoverage(value: number | null): string {
  return value === null ? "Not available" : `${Math.round(value * 100)}%`;
}

export function describeCurrentAdvice(row: ProgrammeFidelityRow): string {
  if (!row.is_current_owner) {
    return "Former owner — current tracker advice is not assigned to this EA.";
  }
  if (row.introduce_letters === null || row.advice_reason === null) {
    return "Current letter guidance is unavailable until the source-data issue is corrected.";
  }
  if (row.advice_reason === "terminal") {
    return "The current tracker model has reached the end of this language sequence.";
  }
  const letters = row.introduce_letters.length
    ? row.introduce_letters.join(", ")
    : "none yet";
  if (row.advice_reason === "low_coverage") {
    return `Suggested next letters: ${letters}. Confidence is limited by low tracker coverage.`;
  }
  if (row.advice_reason === "day_one") {
    return `Start with: ${letters}. This is day-one guidance for the current roster.`;
  }
  if (row.advice_reason === "empty") {
    return `Suggested starting letters: ${letters}. No current letter evidence is available yet.`;
  }
  return `Suggested next letters: ${letters}.`;
}

export function buildProgrammeFidelityHref(
  filters: ProgrammeFidelityFilters,
  expansion: ProgrammeFidelityExpansion | null
): string {
  const query = new URLSearchParams();
  if (filters.schoolId) query.set("school_id", filters.schoolId);
  if (filters.eaUserId) query.set("ea_user_id", filters.eaUserId);
  query.set("attention", filters.attention);
  if (expansion) {
    query.set("expanded_group_id", expansion.groupId);
    query.set("expanded_ea_user_id", expansion.eaUserId);
  }
  return `/mobile-app/programme-fidelity?${query.toString()}`;
}

export function recentSessionsHref(row: ProgrammeFidelityRow): string {
  const query = new URLSearchParams({ days: "14" });
  if (row.school_id) query.set("school_id", row.school_id);
  return `/mobile-app/sessions?${query.toString()}`;
}
