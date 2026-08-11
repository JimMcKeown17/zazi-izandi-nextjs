import type { MobileTimeEntryRow } from "./types";

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  return `${hours}h ${remainingMinutes.toString().padStart(2, "0")}m`;
}
export type TimeEntryState = "active" | "automatic" | "completed";

export function getTimeEntryState(entry: MobileTimeEntryRow): TimeEntryState {
  if (entry.is_active) return "active";
  if (entry.auto_clocked_out) return "automatic";
  return "completed";
}
