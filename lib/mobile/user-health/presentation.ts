import type { MobileUserHealthRow } from "./types";

export type UserAttentionReason =
  | "auth_blocked"
  | "seeded_classes_missing"
  | "seeded_children_missing"
  | "seeded_groups_missing"
  | "seeded_memberships_incomplete";

export type ActivityStage = "not_started" | "reached" | "active";
export type UserHealthSortKey =
  | "urgency"
  | "last_activity"
  | "name"
  | "school";
export type UserHealthPredicate =
  | "all"
  | "has_blockers"
  | "active"
  | "reached"
  | "not_started";

export interface ProvisioningAuthenticationPresentation {
  label: string;
  detail: string;
  tone: "proven" | "not_proven" | "unmeasured";
}

export function hasSeededDataReady(user: MobileUserHealthRow): boolean {
  return (
    user.data.expectation === "seeded" &&
    user.data.classes > 0 &&
    user.data.children > 0 &&
    user.data.groups > 0 &&
    user.data.grouped_children === user.data.children
  );
}

function hasUsageEvidenceInWindow(user: MobileUserHealthRow): boolean {
  return (
    user.activity.clock_entries +
      user.activity.sessions +
      user.activity.app_assessments >
    0
  );
}

export function hasRecentAppActivity(user: MobileUserHealthRow): boolean {
  return hasUsageEvidenceInWindow(user);
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

export function getActivityStage(user: MobileUserHealthRow): ActivityStage {
  if (hasUsageEvidenceInWindow(user)) return "active";
  if (user.app_device.registered) return "reached";
  if (user.auth.authenticated_after_provisioning) return "reached";
  return "not_started";
}

const STAGE_URGENCY: Record<ActivityStage, number> = {
  not_started: 0,
  reached: 1,
  active: 2,
};

export function sortUserHealthRows(
  rows: MobileUserHealthRow[],
  key: UserHealthSortKey
): MobileUserHealthRow[] {
  const sorted = [...rows];
  if (key === "name") {
    return sorted.sort((a, b) => a.display_name.localeCompare(b.display_name));
  }
  if (key === "school") {
    return sorted.sort(
      (a, b) =>
        a.current_school.localeCompare(b.current_school) ||
        a.display_name.localeCompare(b.display_name)
    );
  }
  if (key === "last_activity") {
    return sorted.sort((a, b) => {
      const left = a.activity.last_activity_at;
      const right = b.activity.last_activity_at;
      if (left === right) return a.display_name.localeCompare(b.display_name);
      if (left === null) return 1;
      if (right === null) return -1;
      const timeGap =
        new Date(right).getTime() - new Date(left).getTime();
      if (timeGap !== 0) return timeGap;
      return a.display_name.localeCompare(b.display_name);
    });
  }
  return sorted.sort((a, b) => {
    const blockerGap =
      getUserAttentionReasons(b).length - getUserAttentionReasons(a).length;
    if (blockerGap !== 0) return blockerGap;
    const stageGap =
      STAGE_URGENCY[getActivityStage(a)] -
      STAGE_URGENCY[getActivityStage(b)];
    if (stageGap !== 0) return stageGap;
    return a.display_name.localeCompare(b.display_name);
  });
}

export function matchesUserHealthPredicate(
  user: MobileUserHealthRow,
  predicate: UserHealthPredicate
): boolean {
  if (predicate === "all") return true;
  if (predicate === "has_blockers") {
    return getUserAttentionReasons(user).length > 0;
  }
  return getActivityStage(user) === predicate;
}

export function getProvisioningAuthenticationPresentation(
  user: MobileUserHealthRow
): ProvisioningAuthenticationPresentation {
  if (user.auth.authenticated_after_provisioning === true) {
    return {
      label: "Authenticated after provisioning",
      detail: "Auth proof; app and device are not identified",
      tone: "proven",
    };
  }
  if (user.auth.authenticated_after_provisioning === false) {
    return {
      label: "No authentication after provisioning",
      detail: "No Auth event has crossed the rollout cutoff",
      tone: "not_proven",
    };
  }
  return {
    label: "Post-provisioning authentication unmeasured",
    detail: "No trusted rollout cutoff applies to this account",
    tone: "unmeasured",
  };
}
