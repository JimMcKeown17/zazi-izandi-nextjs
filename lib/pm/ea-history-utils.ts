import type {
  EAPerformanceHistoryResponse,
  EATrajectoryPoint,
} from "./types";

export type MovementClass = "improved" | "regressed" | "stalled";

export type WindowMode = "2w" | "4w" | "term";

export const WINDOW_DAYS: Record<Exclude<WindowMode, "term">, number> = {
  "2w": 14,
  "4w": 28,
};

/**
 * Classify the direction of an EA's movement vector from start to end.
 *
 * X is weighted lower than Y because sessions_per_programme_day is a
 * cumulative-rate metric that drifts slowly; alignment_avg_score moves more
 * sharply per session. A magnitude under THRESHOLD is treated as "stalled"
 * (noise, not real motion).
 */
export function classifyMovement(
  start: { x: number; y: number | null },
  end: { x: number; y: number | null }
): MovementClass {
  if (start.y === null || end.y === null) return "stalled";
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const mag = Math.hypot(dx * 0.5, dy / 100);
  if (mag < 0.05) return "stalled";
  if (dx >= 0 && dy >= 0) return "improved";
  if (dx <= 0 && dy <= 0) return "regressed";
  return "stalled"; // mixed directions — don't claim improvement
}

/**
 * Pick the trajectory point at a given target date. Falls back to the earliest
 * available point if the EA has no data at the target date (e.g., joined the
 * programme after the window's start).
 *
 * Returns null only if the trajectory is empty.
 */
export function pointAt(
  trajectory: EATrajectoryPoint[],
  targetDateISO: string
): EATrajectoryPoint | null {
  if (trajectory.length === 0) return null;
  // Find the latest point whose date <= targetDateISO. If none, return earliest.
  let candidate: EATrajectoryPoint | null = null;
  for (const p of trajectory) {
    if (p.date <= targetDateISO) candidate = p;
    else break;
  }
  return candidate ?? trajectory[0];
}

/**
 * Resolve the window-start ISO date for a given window mode.
 * For "2w" / "4w": today minus N days, but clamped to the earliest available
 * snapshot date (so "4w ago" never points to a date before backfill began).
 * For "term": the earliest available snapshot date.
 */
export function resolveWindowStartDate(
  history: EAPerformanceHistoryResponse,
  windowMode: WindowMode,
  todayISO: string
): string | null {
  if (history.dates.length === 0) return null;
  const earliest = history.dates[0];

  if (windowMode === "term") return earliest;

  const days = WINDOW_DAYS[windowMode];
  const target = new Date(todayISO);
  target.setUTCDate(target.getUTCDate() - days);
  const targetISO = target.toISOString().slice(0, 10);

  return targetISO < earliest ? earliest : targetISO;
}

/**
 * Count EAs whose movement vector classifies as 'improved' over the 4w window.
 *
 * Used server-side for the "Improving %" KPI on the EA Performance Map page.
 * EAs with no trajectory or no Y-axis data at either anchor are excluded.
 */
export function countImproving(
  history: EAPerformanceHistoryResponse,
  windowMode: WindowMode = "4w",
  todayISO: string = new Date().toISOString().slice(0, 10)
): { improving: number; total: number } {
  const startISO = resolveWindowStartDate(history, windowMode, todayISO);
  if (!startISO) return { improving: 0, total: 0 };

  let improving = 0;
  let total = 0;
  for (const ea of history.eas) {
    if (ea.trajectory.length === 0) continue;
    const end = ea.trajectory[ea.trajectory.length - 1];
    const start = pointAt(ea.trajectory, startISO);
    if (!start || start.y === null || end.y === null) continue;
    total += 1;
    if (classifyMovement(start, end) === "improved") improving += 1;
  }
  return { improving, total };
}
