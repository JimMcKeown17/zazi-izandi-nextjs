import { mobileUserProfileSchema } from "./schema";
import type { MobileUserProfileResponse } from "./types";

export type MobileUserProfileResult =
  | { ok: true; data: MobileUserProfileResponse }
  | { ok: false; status: 404; notFound: true }
  | { ok: false; status: 422; dataQuality: true }
  | { ok: false; status: number; message: string };

function hasErrorCode(payload: unknown, code: string): boolean {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  return record.code === code;
}

export async function decodeMobileUserProfileResponse(
  response: Response
): Promise<MobileUserProfileResult> {
  if (!response.ok) {
    if (response.status === 404 || response.status === 422) {
      try {
        const payload: unknown = await response.json();
        if (
          response.status === 404 &&
          hasErrorCode(payload, "mobile_user_not_found")
        ) {
          return { ok: false, status: 404, notFound: true };
        }
        if (
          response.status === 422 &&
          hasErrorCode(payload, "mobile_user_profile_data_integrity")
        ) {
          return { ok: false, status: 422, dataQuality: true };
        }
      } catch {
        // An HTML or empty error response is a service failure, not a stable user state.
      }
    }
    return {
      ok: false,
      status: response.status,
      message: "The user profile service could not return user data.",
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      message: "The user profile service returned an unexpected format.",
    };
  }

  const parsed = mobileUserProfileSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      status: 502,
      message: "The user profile service returned an unexpected format.",
    };
  }
  return { ok: true, data: parsed.data };
}
