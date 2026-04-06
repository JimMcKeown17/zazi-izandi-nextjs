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

export async function getProgrammeOverview(): Promise<ProgrammeOverviewResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — using mock data");
    return { data: MOCK_PROGRAMME_OVERVIEW, isLive: false };
  }

  try {
    const res = await fetch(`${apiUrl}/api/programme-overview/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[pm/api] Programme overview returned ${res.status} — using mock data`);
      return { data: MOCK_PROGRAMME_OVERVIEW, isLive: false };
    }

    return { data: await res.json(), isLive: true };
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
