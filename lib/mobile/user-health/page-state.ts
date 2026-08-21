export const DEFAULT_USER_HEALTH_DAYS = 7;

export function firstUserHealthParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseUserHealthDays(value: string | undefined): number {
  if (!value) return DEFAULT_USER_HEALTH_DAYS;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 90
    ? parsed
    : DEFAULT_USER_HEALTH_DAYS;
}
