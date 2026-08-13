import { formatDuration } from "../time-entries/presentation";
import type { MobileUserHealthRow } from "../user-health/types";
import type { MobileUserProfileResponse } from "./types";

export function formatSessionFocus(
  letters: string[] | null,
  blends: string[] | null
): string {
  if (letters !== null && letters.length > 0) {
    return letters.map((letter) => letter.toUpperCase()).join(", ");
  }
  if (blends !== null && blends.length > 0) {
    return `Blending: ${blends.join(", ")}`;
  }
  return "—";
}

export function formatDurationMinutes(minutes: number | null): string {
  return minutes === null ? "—" : formatDuration(minutes);
}

export function formatDurationSeconds(seconds: number | null): string {
  return seconds === null ? "—" : formatDuration(Math.round(seconds / 60));
}

export function toHealthRowShape(
  profile: MobileUserProfileResponse
): MobileUserHealthRow {
  return {
    user_id: profile.user_id,
    display_name:
      profile.identity?.display_name ?? profile.email ?? profile.user_id,
    email: profile.email,
    employment_status: profile.identity?.employment_status ?? null,
    current_school_id: profile.identity?.current_school_id ?? null,
    current_school: profile.identity?.current_school ?? "Unattributed",
    wave: profile.wave,
    first_ever_activity_at: profile.lifetime.first_ever_activity_at,
    last_ever_activity_at: profile.lifetime.last_ever_activity_at,
    ever_registered_device: profile.ever_registered_device,
    first_app_open_at: profile.lifetime.first_app_open_at,
    last_app_open_at: profile.lifetime.last_app_open_at,
    auth: profile.auth,
    app_device: profile.app_device,
    data: {
      expectation: profile.identity?.data_expectation ?? "unknown",
      classes: profile.data.classes,
      children: profile.data.children,
      groups: profile.data.groups,
      grouped_children: profile.data.grouped_children,
      imported_assessments: profile.data.imported_assessments,
    },
    activity: profile.windowed_activity,
  };
}
