/**
 * Raw response shape from /api/schools-2026/ — per-school data.
 * This was previously defined in school-card-2026.tsx.
 */
export interface School2026Data {
  school_name: string;
  school_type: string;
  eas: string[];
  ea_count: number;
  children_count: number;
  groups_count: number;
  sessions_this_week: number;
  sessions_this_month: number;
  total_sessions: number;
  avg_sessions_per_group_per_week: number;
  flags: {
    same_letter_group: { flagged_eas: number; total_eas: number };
    moving_too_fast: { flagged_eas: number; total_eas: number };
  };
  latitude: number | null;
  longitude: number | null;
}
