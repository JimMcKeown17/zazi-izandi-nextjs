import type { MobileUserHealthRow } from "./types";

export type UserAttentionReason =
  | "auth_blocked"
  | "seeded_classes_missing"
  | "seeded_children_missing"
  | "seeded_groups_missing"
  | "seeded_memberships_incomplete";

export const ATTENTION_LABELS: Record<UserAttentionReason, string> = {
  auth_blocked: "Auth blocked",
  seeded_classes_missing: "Class missing",
  seeded_children_missing: "Children missing",
  seeded_groups_missing: "Groups missing",
  seeded_memberships_incomplete: "Group memberships incomplete",
};

export const BLOCKER_PLAYBOOK: Record<UserAttentionReason, string> = {
  auth_blocked:
    "The EA cannot log in. Check the email address in Supabase Auth, resend the confirmation, or lift the ban — then re-check this board.",
  seeded_classes_missing:
    "No class landed for this EA. Confirm their class assignment in TeamPact, then re-run the seed for this EA.",
  seeded_children_missing:
    "No children landed for this EA. Confirm the TeamPact roster, then re-run the seed for this EA.",
  seeded_groups_missing:
    "Children exist but no groups landed. Check the seeding manifest for this EA's groups.",
  seeded_memberships_incomplete:
    "Some children are not in any group. Re-check group memberships in the seed for this EA.",
};

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
  | "activated"
  | "quiet"
  | "reached"
  | "not_started";

export interface BoardSelection {
  query: string;
  predicate: UserHealthPredicate;
  cohort: MobileUserHealthRow["data"]["expectation"] | "all";
  sortKey: UserHealthSortKey;
}

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

export function hasEverUsedApp(user: MobileUserHealthRow): boolean {
  return (
    hasUsageEvidenceInWindow(user) ||
    (user.last_ever_activity_at ?? null) !== null
  );
}

export function hasEverRegisteredDevice(user: MobileUserHealthRow): boolean {
  return user.ever_registered_device === true || user.app_device.registered;
}

export function isQuiet(user: MobileUserHealthRow): boolean {
  return hasEverUsedApp(user) && !hasRecentAppActivity(user);
}

export function hasEverOpenedApp(user: MobileUserHealthRow): boolean {
  return (user.last_app_open_at ?? null) !== null;
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
  if (hasEverUsedApp(user)) return "active";
  if (hasEverRegisteredDevice(user)) return "reached";
  // A signed-in app open proves reach even when no push token ever
  // existed (e.g. notification permission denied) — round-8 finding.
  if (hasEverOpenedApp(user)) return "reached";
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
  // WINDOWED: "active" is what the "Active · Nd" summary tile links to;
  // its count and drill-down must reconcile with summary.active_in_window.
  if (predicate === "active") return hasRecentAppActivity(user);
  // LIFETIME: the durable stage axis.
  if (predicate === "activated") return getActivityStage(user) === "active";
  if (predicate === "quiet") return isQuiet(user);
  return getActivityStage(user) === predicate; // "reached" | "not_started"
}

export function selectBoardRows(
  users: MobileUserHealthRow[],
  selection: BoardSelection
): MobileUserHealthRow[] {
  const needle = selection.query.trim().toLowerCase();
  const filtered = users.filter((user) => {
    const matchesQuery =
      needle.length === 0 ||
      user.display_name.toLowerCase().includes(needle) ||
      (user.email?.toLowerCase().includes(needle) ?? false) ||
      user.user_id.toLowerCase() === needle;
    return (
      matchesQuery &&
      matchesUserHealthPredicate(user, selection.predicate) &&
      (selection.cohort === "all" ||
        user.data.expectation === selection.cohort)
    );
  });
  return sortUserHealthRows(filtered, selection.sortKey);
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
