export function getStaleHoursAgo(lastUpdated: string | null): number | null {
  if (!lastUpdated) return null;
  const updatedAt = new Date(lastUpdated);
  if (isNaN(updatedAt.getTime())) return null;
  return Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60));
}
