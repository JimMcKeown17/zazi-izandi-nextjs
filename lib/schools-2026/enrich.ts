import type { GroupSummary, EAHeatmapRow } from "@/lib/pm/types";
import type { School2026Data } from "./school2026-data";
import type {
  EnrichedSchool2026,
  EADetail,
  EAGroupDetail,
  FlagBreakdown,
} from "./types";
import { countWorkDays, TEACHING_START_DATE } from "./constants";

const FLAG_KEYS = [
  "same_letter_group",
  "moving_too_fast",
  "ghost_group",
  "stagnation",
  "curriculum_gaps",
] as const;

/**
 * Merges school-level data with group-level data and sessions-activity data
 * to produce enriched school cards with per-EA breakdowns.
 */
export function enrichSchoolsWithGroups(
  schools: School2026Data[],
  groups: GroupSummary[],
  heatmapEAs: EAHeatmapRow[]
): EnrichedSchool2026[] {
  // Build lookups
  const groupsBySchool = new Map<string, GroupSummary[]>();
  for (const g of groups) {
    const arr = groupsBySchool.get(g.program_name);
    if (arr) arr.push(g);
    else groupsBySchool.set(g.program_name, [g]);
  }

  // Build EA heatmap lookup: "ea_name|school" → full row (includes all-time metrics)
  const heatmapByEA = new Map<string, EAHeatmapRow>();
  for (const ea of heatmapEAs) {
    heatmapByEA.set(`${ea.ea_name}|${ea.school}`, ea);
  }

  // Programme work days (from teaching start to today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const programmeWorkDays = countWorkDays(TEACHING_START_DATE, today);

  return schools.map((school) => {
    const schoolGroups = groupsBySchool.get(school.school_name) ?? [];
    const { eas, totalFlags: rawTotalFlags, flagBreakdown: rawFlagBreakdown } = buildEADetails(
      schoolGroups,
      school.school_name,
      heatmapByEA,
      programmeWorkDays
    );

    // Fallback: when groups data is unavailable, use the 2 flag types
    // from the schools-2026 endpoint so flags aren't lost in degradation
    let totalFlags = rawTotalFlags;
    let flagBreakdown = rawFlagBreakdown;
    if (schoolGroups.length === 0 && school.flags) {
      const slg = school.flags.same_letter_group?.flagged_eas ?? 0;
      const mtf = school.flags.moving_too_fast?.flagged_eas ?? 0;
      if (slg > 0 || mtf > 0) {
        flagBreakdown = { ...flagBreakdown, same_letter_group: slg, moving_too_fast: mtf };
        totalFlags = slg + mtf;
      }
    }

    // School-level avg/day: average the per-EA heatmap values so both
    // card-level and expanded-EA-level use the same data source (last 10 weekdays)
    const easWithAvg = eas.filter((e) => e.avg_per_day_worked !== null);
    const schoolAvgPerDay =
      easWithAvg.length > 0
        ? Math.round(
            (easWithAvg.reduce((sum, e) => sum + e.avg_per_day_worked!, 0) /
              easWithAvg.length) *
              10
          ) / 10
        : null;

    // When groups data is available, derive school-level dosage from
    // per-EA dosages so the card hero and EA detail always agree.
    // Fall back to Django's value when groups are unavailable.
    const groupsDosage =
      eas.length > 0
        ? Math.round(
            (eas.reduce((sum, e) => sum + e.weighted_dosage, 0) / eas.length) *
              10
          ) / 10
        : null;

    return {
      school_name: school.school_name,
      school_type: school.school_type,
      ea_count: school.ea_count,
      children_count: school.children_count,
      groups_count: school.groups_count,
      sessions_this_week: school.sessions_this_week,
      sessions_this_month: school.sessions_this_month,
      total_sessions: school.total_sessions,
      avg_sessions_per_group_per_week: school.avg_sessions_per_group_per_week,
      latitude: school.latitude,
      longitude: school.longitude,
      eas,
      total_flags: totalFlags,
      flag_breakdown: flagBreakdown,
      weighted_dosage: groupsDosage ?? school.avg_sessions_per_group_per_week,
      avg_per_day_worked: schoolAvgPerDay,
    };
  });
}

function buildEADetails(
  groups: GroupSummary[],
  schoolName: string,
  heatmapByEA: Map<string, EAHeatmapRow>,
  programmeWorkDays: number
): {
  eas: EADetail[];
  totalFlags: number;
  flagBreakdown: FlagBreakdown;
} {
  // Group by ea_user_id (canonical) with ea_name fallback. This avoids the
  // duplicate-name fragility that name-only keys had — two EAs with the
  // same display name now correctly remain distinct.
  type EAKey = number | string;
  const byEA = new Map<EAKey, GroupSummary[]>();
  for (const g of groups) {
    const key: EAKey = g.ea_user_id ?? `name:${g.ea_name}`;
    const arr = byEA.get(key);
    if (arr) arr.push(g);
    else byEA.set(key, [g]);
  }

  const flagBreakdown: FlagBreakdown = {
    same_letter_group: 0,
    moving_too_fast: 0,
    ghost_group: 0,
    stagnation: 0,
    curriculum_gaps: 0,
  };

  let totalFlags = 0;
  const eas: EADetail[] = [];

  for (const [, eaGroups] of byEA) {
    const firstGroup = eaGroups[0];
    const eaName = firstGroup.ea_name;
    const eaUserId = firstGroup.ea_user_id ?? null;
    // Resigned status is consistent across an EA's groups (same user_id);
    // any "true" wins for safety.
    const isActive = !eaGroups.some((g) => g.ea_resigned === true);

    let eaFlagsCount = 0;
    let eaChildrenCount = 0;
    let eaSessionsThisWeek = 0;
    let eaTotalSessions = 0;
    let dosageSum = 0;

    const groupDetails: EAGroupDetail[] = eaGroups.map((g) => {
      eaChildrenCount += g.children_count;
      eaSessionsThisWeek += g.sessions_this_week;
      eaTotalSessions += g.total_sessions;
      dosageSum += g.avg_sessions_per_week;

      for (const key of FLAG_KEYS) {
        if (g.flags[key]) {
          eaFlagsCount++;
          totalFlags++;
          flagBreakdown[key]++;
        }
      }

      return {
        class_name: g.class_name,
        grade: g.grade,
        phase: g.phase,
        current_letter: g.current_letter,
        progress_pct: g.progress_pct,
        avg_sessions_per_week: g.avg_sessions_per_week,
        flags: { ...g.flags },
      };
    });

    const avgDosage = eaGroups.length > 0 ? dosageSum / eaGroups.length : 0;
    const weightedDosage = Math.round(avgDosage * 10) / 10;

    // Per-EA avg sessions per day worked (all-time, from Django heatmap row).
    // Heatmap is keyed by name|school; resigned EAs won't have a heatmap row
    // anymore, so this returns null and the renderer shows "—".
    const heatmapRow = heatmapByEA.get(`${eaName}|${schoolName}`);
    const avgPerDayWorked = heatmapRow?.avg_per_day_worked ?? null;

    // Per-EA avg sessions per programme day
    let avgPerProgrammeDay: number | null = null;
    if (programmeWorkDays > 0 && eaTotalSessions > 0) {
      avgPerProgrammeDay = Math.round((eaTotalSessions / programmeWorkDays) * 10) / 10;
    }

    eas.push({
      name: eaName,
      user_id: eaUserId,
      is_active: isActive,
      groups_count: eaGroups.length,
      children_count: eaChildrenCount,
      sessions_this_week: eaSessionsThisWeek,
      total_sessions: eaTotalSessions,
      avg_sessions_per_group_per_week: weightedDosage,
      flags_count: eaFlagsCount,
      has_flags: eaFlagsCount > 0,
      groups: groupDetails,
      avg_per_day_worked: avgPerDayWorked,
      avg_per_programme_day: avgPerProgrammeDay,
      weighted_dosage: weightedDosage,
    });
  }

  return { eas, totalFlags, flagBreakdown };
}
