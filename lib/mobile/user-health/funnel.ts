// Wave-scoped rollout instrument with both durable and windowed activity axes.
import {
  hasEverOpenedApp,
  hasEverRegisteredDevice,
  hasEverUsedApp,
  hasRecentAppActivity,
  hasSeededDataReady,
} from "./presentation";
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
  activated_ever: number;
  opened_app_ever: number;
  active_in_window: number;
  seeded_expected: number;
  seeded_data_ready: number;
}

export function buildFunnelCounts(users: MobileUserHealthRow[]): FunnelCounts {
  let authReady = 0;
  let loggedIn = 0;
  let authMeasurable = 0;
  let deviceSignal = 0;
  let activatedEver = 0;
  let openedAppEver = 0;
  let activeInWindow = 0;
  let seededExpected = 0;
  let seededReady = 0;
  for (const user of users) {
    if (user.auth.state === "ready") authReady += 1;
    if (user.auth.authenticated_after_provisioning !== null) {
      authMeasurable += 1;
      if (user.auth.authenticated_after_provisioning) loggedIn += 1;
    }
    if (hasEverRegisteredDevice(user)) deviceSignal += 1;
    if (hasEverUsedApp(user)) activatedEver += 1;
    if (hasEverOpenedApp(user)) openedAppEver += 1;
    if (hasRecentAppActivity(user)) activeInWindow += 1;
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
    activated_ever: activatedEver,
    opened_app_ever: openedAppEver,
    active_in_window: activeInWindow,
    seeded_expected: seededExpected,
    seeded_data_ready: seededReady,
  };
}
