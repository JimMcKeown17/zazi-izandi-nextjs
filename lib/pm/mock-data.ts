import type {
  ProgrammeOverviewResponse,
  SchoolPerformanceRow,
  SchoolDetailResponse,
  SessionTimeSeriesPoint,
} from "./types";

// ─── Time Series: 30 days with increasing trend ─────────────────

function generateTimeSeries(): SessionTimeSeriesPoint[] {
  const series: SessionTimeSeriesPoint[] = [];
  const startDate = new Date("2026-03-06");

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // Weekday multiplier — fewer sessions on weekends
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    const baseMultiplier = isWeekend ? 0.1 : 1;

    // Increasing trend: ramp from ~60% to ~100% over 30 days
    const trendFactor = 0.6 + (i / 29) * 0.4;

    const primary = Math.round(baseMultiplier * trendFactor * (80 + Math.random() * 20));
    const ecd = Math.round(baseMultiplier * trendFactor * (40 + Math.random() * 15));
    const total = primary + ecd;

    series.push({
      date: date.toISOString().split("T")[0],
      primary,
      ecd,
      total,
    });
  }

  return series;
}

// ─── Programme Overview ──────────────────────────────────────────

export const MOCK_PROGRAMME_OVERVIEW: ProgrammeOverviewResponse = {
  generated_at: "2026-04-05T06:00:00Z",
  programme: {
    year: 2026,
    start_date: "2026-02-02",
    end_date: "2026-11-28",
    current_week: 9,
    total_weeks: 43,
    teaching_start_date: "2026-03-08",
    teaching_week: 4,
    teaching_total_weeks: 38,
  },
  targets: {
    dosage: 3,
    on_track_pct: 80,
    flag_resolution_pct: 70,
    assessment_coverage_pct: 90,
    mentor_coverage_days: 3,
  },
  kpis: {
    total_schools: 12,
    total_schools_primary: 8,
    total_schools_ecd: 4,
    total_eas: 24,
    total_children: 1847,
    weighted_dosage: 2.8,
    on_track_group_rate: 74.2,
    total_sessions_this_week: 312,
    total_sessions_this_month: 1108,
    total_sessions_all_time: 8934,
    active_flags: 17,
    flags_delta_week: -3,
    flag_resolution_rate_14d: 68.5,
    flag_lifecycle: {
      new: 5,
      acknowledged: 7,
      in_progress: 5,
      resolved_this_week: 8,
    },
  },
  health: {
    score: 0.83,
    status: "needs_attention",
    components: {
      dosage: 0.91,
      on_track: 0.92,
      flags: 0.94,
      resolution: 0.90,
    },
  },
  data_health: {
    freshness_hours: 3.2,
    last_sync: "2026-04-05T02:47:00Z",
    join_match_rate: 0.981,
  },
  sessions_time_series: generateTimeSeries(),
  dosage_distribution: [
    { range: "0-1", count: 18 },
    { range: "1-2", count: 32 },
    { range: "2-3", count: 47 },
    { range: "3-4", count: 61 },
    { range: "4-5", count: 29 },
    { range: "5+", count: 11 },
  ],
};

// ─── School Performance Rows ─────────────────────────────────────
// School names are in title case to match real API responses.
// The cohort filter uses toUpperCase() for comparison, so casing here doesn't matter.

export const MOCK_SCHOOL_ROWS: SchoolPerformanceRow[] = [
  // ── Treatment schools (8) ──
  {
    school_name: "Abraham Levy Primary School",
    school_type: "Primary School",
    ea_count: 3,
    children_count: 198,
    groups_count: 8,
    sessions_this_week: 38,
    sessions_this_month: 142,
    total_sessions: 1024,
    avg_sessions_per_group_per_week: 3.4,
    flags_count: 1,
  },
  {
    school_name: "Canzibe Primary School",
    school_type: "Primary School",
    ea_count: 2,
    children_count: 156,
    groups_count: 6,
    sessions_this_week: 19,
    sessions_this_month: 78,
    total_sessions: 612,
    avg_sessions_per_group_per_week: 2.1,
    flags_count: 4,
  },
  {
    school_name: "Frank Joubert Primary School",
    school_type: "Primary School",
    ea_count: 2,
    children_count: 142,
    groups_count: 6,
    sessions_this_week: 24,
    sessions_this_month: 98,
    total_sessions: 731,
    avg_sessions_per_group_per_week: 3.1,
    flags_count: 2,
  },
  {
    school_name: "Walmer Primary School",
    school_type: "Primary School",
    ea_count: 2,
    children_count: 167,
    groups_count: 7,
    sessions_this_week: 11,
    sessions_this_month: 51,
    total_sessions: 389,
    avg_sessions_per_group_per_week: 1.4,
    flags_count: 6,
  },
  {
    school_name: "Malabar Primary School",
    school_type: "Primary School",
    ea_count: 3,
    children_count: 211,
    groups_count: 9,
    sessions_this_week: 33,
    sessions_this_month: 118,
    total_sessions: 876,
    avg_sessions_per_group_per_week: 2.9,
    flags_count: 2,
  },
  {
    school_name: "Ilitha Public Primary School",
    school_type: "Primary School",
    ea_count: 2,
    children_count: 134,
    groups_count: 5,
    sessions_this_week: 21,
    sessions_this_month: 87,
    total_sessions: 643,
    avg_sessions_per_group_per_week: 3.2,
    flags_count: 0,
  },
  {
    school_name: "Nomathamsanqa Primary School",
    school_type: "Primary School",
    ea_count: 2,
    children_count: 148,
    groups_count: 6,
    sessions_this_week: 9,
    sessions_this_month: 42,
    total_sessions: 298,
    avg_sessions_per_group_per_week: 1.1,
    flags_count: 5,
  },
  {
    school_name: "Uitenhage Primary School",
    school_type: "Primary School",
    ea_count: 2,
    children_count: 121,
    groups_count: 5,
    sessions_this_week: 18,
    sessions_this_month: 71,
    total_sessions: 512,
    avg_sessions_per_group_per_week: 2.5,
    flags_count: 2,
  },
  // ── SEF schools (3) ──
  {
    school_name: "Kwanoxolo Primary School",
    school_type: "Primary School",
    ea_count: 2,
    children_count: 143,
    groups_count: 6,
    sessions_this_week: 22,
    sessions_this_month: 84,
    total_sessions: 598,
    avg_sessions_per_group_per_week: 2.7,
    flags_count: 1,
  },
  {
    school_name: "Sapphire Road Primary School",
    school_type: "Primary School",
    ea_count: 2,
    children_count: 118,
    groups_count: 5,
    sessions_this_week: 14,
    sessions_this_month: 55,
    total_sessions: 421,
    avg_sessions_per_group_per_week: 1.9,
    flags_count: 3,
  },
  {
    school_name: "Garrett Public Primary School",
    school_type: "Primary School",
    ea_count: 1,
    children_count: 89,
    groups_count: 4,
    sessions_this_week: 17,
    sessions_this_month: 66,
    total_sessions: 489,
    avg_sessions_per_group_per_week: 3.0,
    flags_count: 0,
  },
  // ── ECD centres (2) ──
  {
    school_name: "Iqhayiya ECD Centre",
    school_type: "ECD",
    ea_count: 1,
    children_count: 87,
    groups_count: 3,
    sessions_this_week: 14,
    sessions_this_month: 54,
    total_sessions: 401,
    avg_sessions_per_group_per_week: 3.6,
    flags_count: 0,
  },
  {
    school_name: "Thuthuka ECD Centre",
    school_type: "ECD",
    ea_count: 2,
    children_count: 112,
    groups_count: 4,
    sessions_this_week: 16,
    sessions_this_month: 62,
    total_sessions: 487,
    avg_sessions_per_group_per_week: 3.1,
    flags_count: 1,
  },
];

// ─── School Detail ───────────────────────────────────────────────

export function getMockSchoolDetail(schoolSlug: string): SchoolDetailResponse {
  // Match slug back to school name (hyphens → spaces, title-case)
  const schoolName = MOCK_SCHOOL_ROWS.find(
    (s) => s.school_name.toLowerCase().replace(/\s+/g, "-") === schoolSlug
  )?.school_name ?? "Siyazama Primary";

  const row = MOCK_SCHOOL_ROWS.find((s) => s.school_name === schoolName) ??
    MOCK_SCHOOL_ROWS[0];

  const eas = Array.from({ length: row.ea_count }, (_, i) => {
    const eaNames = [
      "Nomvula Dlamini",
      "Thandi Nkosi",
      "Sipho Mokoena",
      "Buhle Zulu",
      "Ayanda Sithole",
    ];
    const groupsPerEA = Math.floor(row.groups_count / row.ea_count);
    const childrenPerEA = Math.floor(row.children_count / row.ea_count);
    const sessionsPerEA = Math.floor(row.total_sessions / row.ea_count);
    const weeklyPerEA = Math.floor(row.sessions_this_week / row.ea_count);

    return {
      name: eaNames[i % eaNames.length],
      groups_count: groupsPerEA,
      children_count: childrenPerEA,
      total_sessions: sessionsPerEA,
      sessions_this_week: weeklyPerEA,
      avg_sessions_per_group_per_week: row.avg_sessions_per_group_per_week + (Math.random() * 0.4 - 0.2),
      flags_count: Math.floor(row.flags_count / row.ea_count),
    };
  });

  const flagTypes = [
    { flag_type: "low_dosage", entity: "Group A", detail: "Avg 1.2 sessions/week for 3 weeks", status: "in_progress" },
    { flag_type: "missed_session", entity: "Group B", detail: "No sessions logged in 5 days", status: "acknowledged" },
    { flag_type: "absent_children", entity: "Group C", detail: "3 children absent >3 consecutive sessions", status: "new" },
  ];

  const recentSessions = Array.from({ length: 14 }, (_, i) => {
    const date = new Date("2026-04-05");
    date.setDate(date.getDate() - (13 - i));
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return {
      date: date.toISOString().split("T")[0],
      session_count: isWeekend ? 0 : Math.round(row.sessions_this_week / 5 + Math.random() * 2),
    };
  });

  return {
    school_name: row.school_name,
    school_type: row.school_type,
    ea_count: row.ea_count,
    children_count: row.children_count,
    groups_count: row.groups_count,
    total_sessions: row.total_sessions,
    avg_sessions_per_group_per_week: row.avg_sessions_per_group_per_week,
    eas,
    flags: flagTypes.slice(0, row.flags_count > 0 ? Math.min(row.flags_count, 3) : 0),
    recent_sessions: recentSessions,
  };
}
