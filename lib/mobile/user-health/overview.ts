import {
  hasEverUsedApp,
  hasRecentAppActivity,
} from "./presentation";
import type {
  MobileUserDataExpectation,
  MobileUserHealthRow,
} from "./types";
import { filterRowsByWave, type WaveSelection } from "./wave";

export interface UserHealthPopulationSelection {
  cohort: MobileUserDataExpectation | "all";
  wave: WaveSelection;
}

export interface UserHealthOverviewMetrics {
  accounts: number;
  activatedEver: number;
  activeInWindow: number;
  needsAttention: number;
  attentionAccess: number;
  attentionSetup: number;
}

export function filterUserHealthPopulation(
  users: MobileUserHealthRow[],
  selection: UserHealthPopulationSelection
): MobileUserHealthRow[] {
  return filterRowsByWave(users, selection.wave).filter(
    (user) =>
      selection.cohort === "all" ||
      user.data.expectation === selection.cohort
  );
}

export function buildUserHealthOverviewMetrics(
  users: MobileUserHealthRow[]
): UserHealthOverviewMetrics {
  return {
    accounts: users.length,
    activatedEver: users.filter(hasEverUsedApp).length,
    activeInWindow: users.filter(hasRecentAppActivity).length,
    needsAttention: users.filter((user) => user.attention_reasons.length > 0)
      .length,
    attentionAccess: users.filter((user) =>
      user.attention_reasons.includes("auth_blocked")
    ).length,
    attentionSetup: users.filter((user) =>
      user.attention_reasons.some((reason) => reason !== "auth_blocked")
    ).length,
  };
}

export function formatActiveCardLabel(days: number): string {
  return days === 1 ? "Active today" : `Active · ${days}d`;
}
