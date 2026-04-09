import type {
  ProgrammeOverviewResponse,
  SchoolPerformanceRow,
  SessionsActivityResponse,
  Groups2026Response,
  FlagEvidenceResponse,
  LetterAlignmentResponse,
  AssessmentsSummaryResponse,
  MentorVisitsSummaryResponse,
} from "./types";
import type { School2026Data } from "@/lib/schools-2026/school2026-data";
import type { EnrichedSchool2026 } from "@/lib/schools-2026/types";
import { enrichSchoolsWithGroups } from "@/lib/schools-2026/enrich";

// ─── Programme Overview ──────────────────────────────────────────

export interface ProgrammeOverviewResult {
  data: ProgrammeOverviewResponse;
  isLive: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Maps the Django /api/programme-overview/ response to the frontend
 * ProgrammeOverviewResponse type. Handles field name differences and
 * defaults for fields not yet computed by the backend (flag lifecycle).
 */
function transformOverviewResponse(raw: any): ProgrammeOverviewResponse {
  const k = raw.kpis ?? {};
  const h = raw.health?.components ?? {};

  return {
    generated_at: raw.generated_at,
    programme: raw.programme,
    targets: raw.targets,
    kpis: {
      total_schools: k.total_schools ?? 0,
      total_schools_primary: k.total_schools_primary ?? 0,
      total_schools_ecd: k.total_schools_ecd ?? 0,
      total_eas: k.total_eas ?? 0,
      total_children: k.total_children ?? 0,
      weighted_dosage: k.weighted_dosage ?? 0,
      on_track_group_rate: k.on_track_rate ?? 0,
      total_sessions_this_week: k.sessions_this_week ?? 0,
      total_sessions_this_month: k.sessions_this_month ?? 0,
      total_sessions_all_time: k.total_sessions ?? 0,
      active_flags: k.flagged_eas ?? 0,
      flags_delta_week: k.flags_delta_week ?? 0,
      flag_resolution_rate_14d: k.flag_resolution_rate_14d ?? 0,
      flag_lifecycle: k.flag_lifecycle ?? {
        new: 0,
        acknowledged: 0,
        in_progress: 0,
        resolved_this_week: 0,
      },
      avg_sessions_per_day_worked: k.avg_sessions_per_day_worked ?? 0,
      pct_eas_on_track: k.pct_eas_on_track ?? 0,
      avg_sessions_per_programme_day: k.avg_sessions_per_programme_day ?? 0,
    },
    health: {
      score: raw.health?.score ?? 0,
      status: raw.health?.status ?? "needs_attention",
      components: {
        dosage: h.dosage_score ?? h.dosage ?? 0,
        on_track: h.on_track_score ?? h.on_track ?? 0,
        flags: h.flags_score ?? h.flags ?? 0,
        resolution: h.resolution_score ?? h.resolution ?? 0,
      },
    },
    data_health: raw.data_health,
    sessions_time_series: raw.sessions_time_series ?? [],
    dosage_distribution: (raw.dosage_distribution ?? []).map(
      (b: any) => ({ range: b.range, count: b.count ?? b.schools ?? 0 })
    ),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getProgrammeOverview(
  cohort = "all"
): Promise<ProgrammeOverviewResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — data unavailable");
    return { data: EMPTY_PROGRAMME_OVERVIEW, isLive: false };
  }

  try {
    const res = await fetch(
      `${apiUrl}/api/programme-overview/?cohort=${encodeURIComponent(cohort)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      console.error(`[pm/api] Programme overview returned ${res.status} — data unavailable`);
      return { data: EMPTY_PROGRAMME_OVERVIEW, isLive: false };
    }

    return { data: transformOverviewResponse(await res.json()), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch programme overview:", error);
    return { data: EMPTY_PROGRAMME_OVERVIEW, isLive: false };
  }
}

// ─── School Performance Rows ─────────────────────────────────────

interface Schools2026ApiResponse {
  generated_at: string;
  summary: {
    total_schools: number;
    total_eas: number;
    total_children: number;
    total_sessions_this_week: number;
    total_sessions_this_month: number;
  };
  schools: School2026Data[];
}

function transformToSchoolRows(schools: School2026Data[]): SchoolPerformanceRow[] {
  return schools.map((s) => {
    // Derive flags_count from the nested flags structure in School2026Data
    const flagsCount =
      (s.flags?.same_letter_group?.flagged_eas ?? 0) +
      (s.flags?.moving_too_fast?.flagged_eas ?? 0);

    return {
      school_name: s.school_name,
      school_type: s.school_type ?? "primary",
      ea_count: s.ea_count ?? 0,
      children_count: s.children_count ?? 0,
      groups_count: s.groups_count ?? 0,
      sessions_this_week: s.sessions_this_week ?? 0,
      sessions_this_month: s.sessions_this_month ?? 0,
      total_sessions: s.total_sessions ?? 0,
      avg_sessions_per_group_per_week: s.avg_sessions_per_group_per_week ?? 0,
      flags_count: flagsCount,
    };
  });
}

export interface SchoolRowsResult {
  data: SchoolPerformanceRow[];
  isLive: boolean;
}

export async function getSchoolPerformanceRows(): Promise<SchoolRowsResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — school data unavailable");
    return { data: [], isLive: false };
  }

  try {
    const res = await fetch(`${apiUrl}/api/schools-2026/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[pm/api] Schools API returned ${res.status} — data unavailable`);
      return { data: [], isLive: false };
    }

    const data: Schools2026ApiResponse = await res.json();
    return { data: transformToSchoolRows(data.schools), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch school rows:", error);
    return { data: [], isLive: false };
  }
}

// ─── School Detail ───────────────────────────────────────────────
// Enriches data from schools-2026, groups-2026, and sessions-activity
// endpoints to build a full school detail view.

export interface SchoolDetailResult {
  data: EnrichedSchool2026 | null;
  isLive: boolean;
}

export async function getSchoolDetail(
  schoolSlug: string
): Promise<SchoolDetailResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    return { data: null, isLive: false };
  }

  try {
    const [schoolsRes, groupsRes, sessionsRes] = await Promise.all([
      fetch(`${apiUrl}/api/schools-2026/`, { next: { revalidate: 300 } }),
      fetch(`${apiUrl}/api/groups-2026/`, { next: { revalidate: 300 } }),
      fetch(`${apiUrl}/api/sessions-activity/?days=30`, { next: { revalidate: 300 } }),
    ]);

    if (!schoolsRes.ok) {
      console.error(`[pm/api] Schools API returned ${schoolsRes.status} for school detail`);
      return { data: null, isLive: false };
    }

    const schoolsData: Schools2026ApiResponse = await schoolsRes.json();
    const groupsData = groupsRes.ok ? await groupsRes.json() : { groups: [] };
    const sessionsData = sessionsRes.ok
      ? await sessionsRes.json()
      : { ea_heatmap: { eas: [] } };

    const enriched = enrichSchoolsWithGroups(
      schoolsData.schools,
      groupsData.groups ?? [],
      sessionsData.ea_heatmap?.eas ?? []
    );

    // Match slug to school: slug is lowercase-hyphenated school name
    const match = enriched.find(
      (s) => s.school_name.toLowerCase().replace(/\s+/g, "-") === schoolSlug
    );

    return { data: match ?? null, isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch school detail:", error);
    return { data: null, isLive: false };
  }
}

// ─── Sessions Activity ──────────────────────────────────────────

export interface SessionsActivityResult {
  data: SessionsActivityResponse;
  isLive: boolean;
}

export async function getSessionsActivity(
  days = 30,
  cohort = "all"
): Promise<SessionsActivityResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — sessions activity unavailable");
    return { data: EMPTY_SESSIONS_ACTIVITY, isLive: false };
  }

  try {
    const res = await fetch(
      `${apiUrl}/api/sessions-activity/?days=${days}&cohort=${cohort}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      console.error(`[pm/api] Sessions activity returned ${res.status}`);
      return { data: EMPTY_SESSIONS_ACTIVITY, isLive: false };
    }

    return { data: await res.json(), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch sessions activity:", error);
    return { data: EMPTY_SESSIONS_ACTIVITY, isLive: false };
  }
}

const EMPTY_SESSIONS_ACTIVITY: SessionsActivityResponse = {
  generated_at: "",
  days: 30,
  daily_trend: [],
  ea_heatmap: { dates: [], eas: [] },
  distribution: [],
  school_summary: [],
};

// ─── Groups 2026 ────────────────────────────────────────────────

export interface Groups2026Result {
  data: Groups2026Response;
  isLive: boolean;
}

export async function getGroups2026(): Promise<Groups2026Result> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — groups data unavailable");
    return { data: EMPTY_GROUPS_2026, isLive: false };
  }

  try {
    const res = await fetch(`${apiUrl}/api/groups-2026/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[pm/api] Groups API returned ${res.status}`);
      return { data: EMPTY_GROUPS_2026, isLive: false };
    }

    return { data: await res.json(), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch groups:", error);
    return { data: EMPTY_GROUPS_2026, isLive: false };
  }
}

// ─── Flag Evidence (client-side fetch via same-origin proxy) ────

export async function getFlagEvidence(
  school: string,
  group: string
): Promise<FlagEvidenceResponse | null> {
  try {
    const res = await fetch(
      `/api/flag-evidence/?school=${encodeURIComponent(school)}&group=${encodeURIComponent(group)}`
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Letter Alignment ──────────────────────────────────────────

export async function getLetterAlignment(
  school?: string,
  group?: string
): Promise<LetterAlignmentResponse[] | null> {
  const apiUrl = process.env.DJANGO_API_URL;
  if (!apiUrl) return null;

  try {
    const params = new URLSearchParams();
    if (school) params.set("school", school);
    if (group) params.set("group", group);

    const res = await fetch(
      `${apiUrl}/api/letter-alignment/?${params.toString()}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const EMPTY_GROUPS_2026: Groups2026Response = {
  generated_at: "",
  summary: {
    total_groups: 0,
    letters_groups: 0,
    blending_groups: 0,
    total_children: 0,
    total_sessions_this_week: 0,
  },
  groups: [],
};

// ─── Assessments Summary ──────────────────────────────────────

export interface AssessmentsSummaryResult {
  data: AssessmentsSummaryResponse;
  isLive: boolean;
}

export async function getAssessmentsSummary(
  grade = "all"
): Promise<AssessmentsSummaryResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — assessments data unavailable");
    return { data: EMPTY_ASSESSMENTS_SUMMARY, isLive: false };
  }

  try {
    const res = await fetch(
      `${apiUrl}/api/assessments-summary/?grade=${encodeURIComponent(grade)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      console.error(`[pm/api] Assessments summary returned ${res.status}`);
      return { data: EMPTY_ASSESSMENTS_SUMMARY, isLive: false };
    }

    return { data: await res.json(), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch assessments summary:", error);
    return { data: EMPTY_ASSESSMENTS_SUMMARY, isLive: false };
  }
}

const EMPTY_ASSESSMENTS_SUMMARY: AssessmentsSummaryResponse = {
  generated_at: "",
  available_grades: [],
  selected_grade: "all",
  overview: {
    total_assessed: 0,
    avg_lcpm: 0,
    avg_wcpm: 0,
    avg_nonwords: 0,
    pct_zero_letters: 0,
    pct_at_benchmark: 0,
    stop_rule_rate: 0,
    completion_rate: 0,
  },
  by_cohort: [],
  by_language: [],
  score_distribution: [],
  by_school: [],
};

// ─── Mentor Visits Summary ────────────────────────────────────

export interface MentorVisitsSummaryResult {
  data: MentorVisitsSummaryResponse;
  isLive: boolean;
}

export async function getMentorVisitsSummary(): Promise<MentorVisitsSummaryResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — mentor visits data unavailable");
    return { data: EMPTY_MENTOR_VISITS_SUMMARY, isLive: false };
  }

  try {
    const res = await fetch(`${apiUrl}/api/mentor-visits-summary/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[pm/api] Mentor visits summary returned ${res.status}`);
      return { data: EMPTY_MENTOR_VISITS_SUMMARY, isLive: false };
    }

    return { data: await res.json(), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch mentor visits summary:", error);
    return { data: EMPTY_MENTOR_VISITS_SUMMARY, isLive: false };
  }
}

const EMPTY_MENTOR_VISITS_SUMMARY: MentorVisitsSummaryResponse = {
  generated_at: "",
  overview: {
    total_visits: 0,
    unique_mentors: 0,
    schools_visited: 0,
    eas_observed: 0,
  },
  compliance: {},
  quality_ratings: {},
  visits_over_time: [],
  by_mentor: [],
  flagged_eas: [],
  coverage: {
    schools_visited_14d: 0,
    total_schools: 0,
    coverage_rate: 0,
    gaps: [],
  },
};

const EMPTY_PROGRAMME_OVERVIEW: ProgrammeOverviewResponse = {
  generated_at: "",
  programme: {
    year: 2026,
    start_date: "",
    end_date: "",
    current_week: 0,
    total_weeks: 0,
    teaching_start_date: "",
    teaching_week: 0,
    teaching_total_weeks: 0,
  },
  targets: {
    dosage: 3,
    on_track_pct: 80,
    flag_resolution_pct: 70,
    assessment_coverage_pct: 90,
    mentor_coverage_days: 3,
  },
  kpis: {
    total_schools: 0,
    total_schools_primary: 0,
    total_schools_ecd: 0,
    total_eas: 0,
    total_children: 0,
    weighted_dosage: 0,
    on_track_group_rate: 0,
    total_sessions_this_week: 0,
    total_sessions_this_month: 0,
    total_sessions_all_time: 0,
    active_flags: 0,
    flags_delta_week: 0,
    flag_resolution_rate_14d: 0,
    flag_lifecycle: { new: 0, acknowledged: 0, in_progress: 0, resolved_this_week: 0 },
    avg_sessions_per_day_worked: 0,
    pct_eas_on_track: 0,
    avg_sessions_per_programme_day: 0,
  },
  health: {
    score: 0,
    status: "needs_attention",
    components: { dosage: 0, on_track: 0, flags: 0, resolution: 0 },
  },
  data_health: {
    freshness_hours: 0,
    last_sync: "",
    join_match_rate: 0,
  },
  sessions_time_series: [],
  dosage_distribution: [],
};
