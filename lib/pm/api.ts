import type {
  ProgrammeOverviewResponse,
  SchoolPerformanceRow,
  SchoolDetailResponse,
} from "./types";
import {
  MOCK_PROGRAMME_OVERVIEW,
  MOCK_SCHOOL_ROWS,
  getMockSchoolDetail,
} from "./mock-data";
import type { School2026Data } from "@/components/schools-2026/school-card-2026";

// ─── Programme Overview ──────────────────────────────────────────

export async function getProgrammeOverview(): Promise<ProgrammeOverviewResponse> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — using mock data");
    return MOCK_PROGRAMME_OVERVIEW;
  }

  try {
    const res = await fetch(`${apiUrl}/api/programme-overview/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[pm/api] Programme overview returned ${res.status} — using mock data`);
      return MOCK_PROGRAMME_OVERVIEW;
    }

    return await res.json();
  } catch (error) {
    console.error("[pm/api] Failed to fetch programme overview:", error);
    return MOCK_PROGRAMME_OVERVIEW;
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

export async function getSchoolPerformanceRows(): Promise<SchoolPerformanceRow[]> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — using mock school rows");
    return MOCK_SCHOOL_ROWS;
  }

  try {
    const res = await fetch(`${apiUrl}/api/schools-2026/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[pm/api] Schools API returned ${res.status} — using mock data`);
      return MOCK_SCHOOL_ROWS;
    }

    const data: Schools2026ApiResponse = await res.json();
    return transformToSchoolRows(data.schools);
  } catch (error) {
    console.error("[pm/api] Failed to fetch school rows:", error);
    return MOCK_SCHOOL_ROWS;
  }
}

// ─── School Detail ───────────────────────────────────────────────
// Uses mock data until a dedicated endpoint exists in Django.

export async function getSchoolDetail(schoolSlug: string): Promise<SchoolDetailResponse> {
  return getMockSchoolDetail(schoolSlug);
}
