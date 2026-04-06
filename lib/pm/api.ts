import type {
  ProgrammeOverviewResponse,
  SchoolPerformanceRow,
  SchoolDetailResponse,
  SessionsActivityResponse,
  Groups2026Response,
  FlagEvidenceResponse,
} from "./types";
import {
  MOCK_PROGRAMME_OVERVIEW,
  MOCK_SCHOOL_ROWS,
  getMockSchoolDetail,
} from "./mock-data";
import type { School2026Data } from "@/components/schools-2026/school-card-2026";

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
    console.warn("[pm/api] DJANGO_API_URL not set — using mock data");
    return { data: MOCK_PROGRAMME_OVERVIEW, isLive: false };
  }

  try {
    const res = await fetch(
      `${apiUrl}/api/programme-overview/?cohort=${encodeURIComponent(cohort)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      console.error(`[pm/api] Programme overview returned ${res.status} — using mock data`);
      return { data: MOCK_PROGRAMME_OVERVIEW, isLive: false };
    }

    return { data: transformOverviewResponse(await res.json()), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch programme overview:", error);
    return { data: MOCK_PROGRAMME_OVERVIEW, isLive: false };
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
    console.warn("[pm/api] DJANGO_API_URL not set — using mock school rows");
    return { data: MOCK_SCHOOL_ROWS, isLive: false };
  }

  try {
    const res = await fetch(`${apiUrl}/api/schools-2026/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[pm/api] Schools API returned ${res.status} — using mock data`);
      return { data: MOCK_SCHOOL_ROWS, isLive: false };
    }

    const data: Schools2026ApiResponse = await res.json();
    return { data: transformToSchoolRows(data.schools), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch school rows:", error);
    return { data: MOCK_SCHOOL_ROWS, isLive: false };
  }
}

// ─── School Detail ───────────────────────────────────────────────
// Uses mock data until a dedicated endpoint exists in Django.

export async function getSchoolDetail(schoolSlug: string): Promise<SchoolDetailResponse> {
  return getMockSchoolDetail(schoolSlug);
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

// ─── Flag Evidence (client-side fetch, no ISR) ─────────────────

export async function getFlagEvidence(
  school: string,
  group: string
): Promise<FlagEvidenceResponse | null> {
  const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;

  if (!apiUrl) return null;

  try {
    const res = await fetch(
      `${apiUrl}/api/flag-evidence/?school=${encodeURIComponent(school)}&group=${encodeURIComponent(group)}`
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
