// Currently no UI consumer: retained for the Part B rollout-wave view (see plan §Part B).
import { hasSeededDataReady } from "./presentation";
import type { MobileUserHealthRow } from "./types";

export interface FunnelCounts {
  accounts: number;
  auth_ready: number;
  // Tri-state source: per-row authenticated_after_provisioning is true | false | null,
  // where null means "no trusted provisioning cutoff for this account" — unmeasured,
  // never failed. The login share is therefore over measurable accounts only.
  logged_in_after_provisioning: number;
  authentication_measurable: number;
  device_signal: number;
  active_in_window: number;
  seeded_expected: number;
  seeded_data_ready: number;
}

export function buildFunnelCounts(users: MobileUserHealthRow[]): FunnelCounts {
  let authReady = 0;
  let loggedIn = 0;
  let authMeasurable = 0;
  let deviceSignal = 0;
  let active = 0;
  let seededExpected = 0;
  let seededReady = 0;
  for (const user of users) {
    if (user.auth.state === "ready") authReady += 1;
    if (user.auth.authenticated_after_provisioning !== null) {
      authMeasurable += 1;
      if (user.auth.authenticated_after_provisioning) loggedIn += 1;
    }
    if (user.app_device.registered) deviceSignal += 1;
    if (
      user.activity.clock_entries +
        user.activity.sessions +
        user.activity.app_assessments >
      0
    )
      active += 1;
    if (user.data.expectation === "seeded") {
      seededExpected += 1;
      if (hasSeededDataReady(user)) seededReady += 1;
    }
  }
  return {
    accounts: users.length,
    auth_ready: authReady,
    logged_in_after_provisioning: loggedIn,
    authentication_measurable: authMeasurable,
    device_signal: deviceSignal,
    active_in_window: active,
    seeded_expected: seededExpected,
    seeded_data_ready: seededReady,
  };
}
