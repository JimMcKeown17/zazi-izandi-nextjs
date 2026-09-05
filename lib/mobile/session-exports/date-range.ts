const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;
const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type ParsedDate = {
  year: number;
  month: number;
  day: number;
  epochMs: number;
};

export type PayPeriodWindow = {
  payRunDate: string;
  startDate: string;
  endDate: string;
  label: string;
};

export type SessionExportRange = {
  startDate: string;
  endDate: string;
  inclusiveDays: number;
};

export function resolveSessionExportDates({
  mode,
  windows,
  selectedPayRun,
  customStartDate,
  customEndDate,
}: {
  mode: "pay-period" | "custom";
  windows: PayPeriodWindow[];
  selectedPayRun: string;
  customStartDate: string;
  customEndDate: string;
}): Pick<SessionExportRange, "startDate" | "endDate"> {
  if (mode === "custom") {
    return { startDate: customStartDate, endDate: customEndDate };
  }
  const selected = windows.find(window => window.payRunDate === selectedPayRun);
  if (!selected) throw new RangeError("choose a valid pay-run window");
  return { startDate: selected.startDate, endDate: selected.endDate };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

function parseIsoDate(value: string): ParsedDate {
  const match = ISO_DATE.exec(value);
  if (!match) throw new RangeError("date must use YYYY-MM-DD");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const epochMs = Date.UTC(year, month - 1, day);
  const normalized = new Date(epochMs);
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    throw new RangeError("date must be a real Gregorian date");
  }
  return { year, month, day, epochMs };
}

function isoFromEpoch(epochMs: number): string {
  const value = new Date(epochMs);
  return formatIsoDate(
    value.getUTCFullYear(),
    value.getUTCMonth() + 1,
    value.getUTCDate()
  );
}

export function getSastToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function validateSessionExportRange(input: {
  startDate: string;
  endDate: string;
  today: string;
}): SessionExportRange {
  const start = parseIsoDate(input.startDate);
  const end = parseIsoDate(input.endDate);
  const today = parseIsoDate(input.today);
  if (end.epochMs < start.epochMs) {
    throw new RangeError("end date must not be before start date");
  }
  if (end.epochMs > today.epochMs) {
    throw new RangeError("end date must not be in the future");
  }
  const inclusiveDays = (end.epochMs - start.epochMs) / DAY_MS + 1;
  if (inclusiveDays > 366) {
    throw new RangeError("date range must not exceed 366 days");
  }
  return {
    startDate: input.startDate,
    endDate: input.endDate,
    inclusiveDays,
  };
}

export function buildPayPeriodWindows(today: string): PayPeriodWindow[] {
  const parsedToday = parseIsoDate(today);
  const windows: PayPeriodWindow[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const payRunDate = formatIsoDate(parsedToday.year, month, 20);
    if (payRunDate > today) continue;
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? parsedToday.year - 1 : parsedToday.year;
    windows.push({
      payRunDate,
      startDate: formatIsoDate(previousYear, previousMonth, 20),
      endDate: formatIsoDate(parsedToday.year, month, 19),
      label: `20 ${FULL_MONTHS[month - 1]} ${parsedToday.year} pay-run window · 20 ${SHORT_MONTHS[previousMonth - 1]}–19 ${SHORT_MONTHS[month - 1]}`,
    });
  }
  return windows.reverse();
}

export function defaultSessionExportRange(today: string): {
  source: "pay-period" | "custom";
  startDate: string;
  endDate: string;
  payRunDate: string | null;
} {
  const latest = buildPayPeriodWindows(today)[0];
  if (latest) {
    return {
      source: "pay-period",
      startDate: latest.startDate,
      endDate: latest.endDate,
      payRunDate: latest.payRunDate,
    };
  }
  const parsedToday = parseIsoDate(today);
  return {
    source: "custom",
    startDate: isoFromEpoch(parsedToday.epochMs - 29 * DAY_MS),
    endDate: today,
    payRunDate: null,
  };
}
