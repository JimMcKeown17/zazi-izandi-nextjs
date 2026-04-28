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
 * Returns null only if the trajectory is empty. Used by the slider where any
 * point (including null-y) is acceptable as a chart projection.
 */
export function pointAt(
  trajectory: EATrajectoryPoint[],
  targetDateISO: string
): EATrajectoryPoint | null {
  if (trajectory.length === 0) return null;
  let candidate: EATrajectoryPoint | null = null;
  for (const p of trajectory) {
    if (p.date <= targetDateISO) candidate = p;
    else break;
  }
  return candidate ?? trajectory[0];
}

/**
 * Find an anchor point with a non-null `y` for arrows / KPI calculations.
 *
 * Strategy:
 *   1. Latest non-null-y point with date <= target.
 *   2. If none, fall *forward* to the earliest non-null-y point at/after target.
 *      This rescues late-joining EAs whose alignment data only starts after
 *      the requested window (otherwise their arrow would be dropped because
 *      pass 1 returned a null-y point).
 *
 * Returns null only when the trajectory has no non-null-y points at all.
 */
export function alignmentAnchorAt(
  trajectory: EATrajectoryPoint[],
  targetDateISO: string
): EATrajectoryPoint | null {
  if (trajectory.length === 0) return null;
  let beforeOrAt: EATrajectoryPoint | null = null;
  for (const p of trajectory) {
    if (p.date > targetDateISO) break;
    if (p.y !== null) beforeOrAt = p;
  }
  if (beforeOrAt) return beforeOrAt;
  for (const p of trajectory) {
    if (p.y !== null) return p;
  }
  return null;
}

/**
 * The anchor date for window math is the *latest snapshot date in `history`*,
 * not wall-clock today. This makes "2w ago" / "4w ago" mean "2/4 weeks before
 * our most recent data point", which is the correct comparison even when the
 * cron lags or the local clock and snapshot timezone disagree. Returns null
 * if the history has no dates.
 */
export function getAnchorDate(
  history: EAPerformanceHistoryResponse
): string | null {
  if (history.dates.length === 0) return null;
  return history.dates[history.dates.length - 1];
}

/**
 * Resolve the window-start ISO date for a given window mode.
 *
 * `anchorISO` is the date the window measures back from. By default it's the
 * latest snapshot date — which is the right anchor for the resting chart and
 * for the Improving% KPI. The slider passes its current date instead, so
 * arrows re-anchor as the user scrubs.
 *
 * For "2w" / "4w": anchor minus N days, clamped to the earliest available
 * snapshot date (so "4w ago" never points to a date before backfill began).
 * For "term": the earliest available snapshot date.
 */
export function resolveWindowStartDate(
  history: EAPerformanceHistoryResponse,
  windowMode: WindowMode,
  anchorISO?: string
): string | null {
  if (history.dates.length === 0) return null;
  const earliest = history.dates[0];

  if (windowMode === "term") return earliest;

  const anchor = anchorISO ?? history.dates[history.dates.length - 1];
  const days = WINDOW_DAYS[windowMode];
  const target = new Date(anchor);
  target.setUTCDate(target.getUTCDate() - days);
  const targetISO = target.toISOString().slice(0, 10);

  return targetISO < earliest ? earliest : targetISO;
}

/**
 * Count EAs whose movement vector classifies as 'improved' over the window.
 *
 * Used server-side for the "Improving %" KPI on the EA Performance Map page.
 * Uses alignmentAnchorAt so late-joining EAs with no alignment data at the
 * window start are still counted from their first available data point.
 */
export function countImproving(
  history: EAPerformanceHistoryResponse,
  windowMode: WindowMode = "4w"
): { improving: number; total: number } {
  if (history.dates.length === 0) return { improving: 0, total: 0 };
  const startISO = resolveWindowStartDate(history, windowMode);
  if (!startISO) return { improving: 0, total: 0 };

  let improving = 0;
  let total = 0;
  for (const ea of history.eas) {
    const start = alignmentAnchorAt(ea.trajectory, startISO);
    // The "end" is the latest non-null-y point in the trajectory.
    let end: EATrajectoryPoint | null = null;
    for (let i = ea.trajectory.length - 1; i >= 0; i--) {
      if (ea.trajectory[i].y !== null) {
        end = ea.trajectory[i];
        break;
      }
    }
    if (!start || !end || start.y === null || end.y === null) continue;
    if (start.date === end.date) continue; // single point — no motion to assess
    total += 1;
    if (classifyMovement(start, end) === "improved") improving += 1;
  }
  return { improving, total };
}
