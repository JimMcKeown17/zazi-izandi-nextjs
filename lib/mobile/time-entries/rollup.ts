import type { MobileTimeEntryRow } from "./types";

export interface EaClockRollup {
  user_id: string;
  ea_name: string;
  current_school: string;
  employment_status: string | null;
  days_clocked: number;
  completed_entries: number;
  total_completed_minutes: number;
  average_shift_minutes: number | null;
  automatic_clock_outs: number;
  automatic_rate: number | null;
  open_now: boolean;
  last_clock_in_at: string;
}

export function buildEaClockRollups(
  entries: MobileTimeEntryRow[]
): EaClockRollup[] {
  const byUser = new Map<string, MobileTimeEntryRow[]>();
  for (const entry of entries) {
    const existing = byUser.get(entry.user_id);
    if (existing) existing.push(entry);
    else byUser.set(entry.user_id, [entry]);
  }

  const rollups: EaClockRollup[] = [];
  for (const rows of byUser.values()) {
    const latest = rows.reduce((a, b) =>
      a.sign_in_time >= b.sign_in_time ? a : b
    );
    const completed = rows.filter((row) => row.duration_minutes !== null);
    const totalMinutes = completed.reduce(
      (sum, row) => sum + (row.duration_minutes ?? 0),
      0
    );
    const automatic = rows.filter((row) => row.auto_clocked_out).length;
    rollups.push({
      user_id: latest.user_id,
      ea_name: latest.ea_name,
      current_school: latest.current_school,
      employment_status: latest.employment_status,
      days_clocked: new Set(rows.map((row) => row.local_date)).size,
      completed_entries: completed.length,
      total_completed_minutes: totalMinutes,
      average_shift_minutes:
        completed.length > 0 ? Math.round(totalMinutes / completed.length) : null,
      automatic_clock_outs: automatic,
      automatic_rate:
        completed.length > 0 ? automatic / completed.length : null,
      open_now: rows.some((row) => row.is_active),
      last_clock_in_at: latest.sign_in_time,
    });
  }

  return rollups.sort(
    (a, b) =>
      b.days_clocked - a.days_clocked || a.ea_name.localeCompare(b.ea_name)
  );
}
