/**
 * Programme and holiday constants — kept in sync with Django
 * (api/views.py SCHOOL_HOLIDAYS_2026 and TEACHING_START_DATE).
 */

export const TEACHING_START_DATE = new Date("2026-03-08");

/** School holiday periods (inclusive). EAs cannot work during these. */
export const SCHOOL_HOLIDAYS_2026: [Date, Date][] = [
  // Easter / school break
  [new Date("2026-03-26"), new Date("2026-04-06")],
];

/** Count weekdays between start and end (inclusive), excluding holiday periods. */
export function countWorkDays(
  start: Date,
  end: Date,
  holidays = SCHOOL_HOLIDAYS_2026
): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      // weekday — check holidays
      const inHoliday = holidays.some(
        ([hStart, hEnd]) => current >= hStart && current <= hEnd
      );
      if (!inHoliday) count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
