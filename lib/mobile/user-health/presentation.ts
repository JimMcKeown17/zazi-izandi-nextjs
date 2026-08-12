import type { MobileUserHealthRow } from "./types";

export type UserAttentionReason =
  | "auth_blocked"
  | "seeded_classes_missing"
  | "seeded_children_missing"
  | "seeded_groups_missing"
  | "seeded_memberships_incomplete";

export type UserHealthState =
  | "active"
  | "onboarding"
  | "not_started"
  | "needs_attention";

export function hasSeededDataReady(user: MobileUserHealthRow): boolean {
  return (
    user.data.expectation === "seeded" &&
    user.data.classes > 0 &&
    user.data.children > 0 &&
    user.data.groups > 0 &&
    user.data.grouped_children === user.data.children
  );
}
export function hasRecentAppActivity(user: MobileUserHealthRow): boolean {
  return (
    user.activity.clock_entries +
      user.activity.sessions +
      user.activity.app_assessments >
    0
  );
}

export function getUserAttentionReasons(
  user: MobileUserHealthRow
): UserAttentionReason[] {
  const reasons: UserAttentionReason[] = [];
  if (user.auth.state !== "ready") reasons.push("auth_blocked");

  if (user.data.expectation === "seeded") {
    if (user.data.classes === 0) reasons.push("seeded_classes_missing");
    if (user.data.children === 0) reasons.push("seeded_children_missing");
    if (user.data.groups === 0) reasons.push("seeded_groups_missing");
    if (
      user.data.children > 0 &&
      user.data.grouped_children !== user.data.children
    ) {
      reasons.push("seeded_memberships_incomplete");
    }
  }
  return reasons;
}

export function getUserHealthState(user: MobileUserHealthRow): UserHealthState {
  if (getUserAttentionReasons(user).length > 0) return "needs_attention";
  if (hasRecentAppActivity(user)) return "active";
  if (user.app_device.registered) return "onboarding";
  return "not_started";
}
