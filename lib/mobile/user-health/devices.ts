import type { MobileUserHealthRow } from "./types";

export interface DeviceVersionCount {
  label: string;
  count: number;
}

export interface SplitVersionBreakdown {
  top: DeviceVersionCount[];
  remainderVersions: number;
  remainderCount: number;
}

export function buildDeviceVersionBreakdown(
  users: MobileUserHealthRow[]
): DeviceVersionCount[] {
  const counts = new Map<string, number>();
  for (const user of users) {
    if (!user.app_device.registered) continue;
    const platform = user.app_device.platform ?? "unknown platform";
    const version = user.app_device.app_version
      ? `v${user.app_device.app_version}`
      : "unknown version";
    const label = `${platform} · ${version}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function splitVersionBreakdown(
  breakdown: readonly DeviceVersionCount[],
  limit: number
): SplitVersionBreakdown {
  const top = breakdown.slice(0, limit);
  const remainder = breakdown.slice(top.length);
  return {
    top,
    remainderVersions: remainder.length,
    remainderCount: remainder.reduce((sum, row) => sum + row.count, 0),
  };
}
