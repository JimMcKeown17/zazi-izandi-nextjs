import type { MobileTimeEntryRow } from "./types";

export interface DailyClockPoint {
  date: string;
  distinct_eas: number;
}

const SAST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Johannesburg",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function buildDailyClockSeries(
  entries: MobileTimeEntryRow[],
  days: number,
  generatedAt: string
): DailyClockPoint[] {
  const easByDate = new Map<string, Set<string>>();
  for (const entry of entries) {
    const set = easByDate.get(entry.local_date) ?? new Set<string>();
    set.add(entry.user_id);
    easByDate.set(entry.local_date, set);
  }

  const end = new Date(generatedAt);
  const series: DailyClockPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(end.getTime() - offset * 24 * 60 * 60 * 1000);
    const date = SAST_DATE.format(day);
    series.push({ date, distinct_eas: easByDate.get(date)?.size ?? 0 });
  }
  return series;
}
