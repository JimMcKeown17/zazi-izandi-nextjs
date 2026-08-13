import { mobileUserProfileSchema } from "./schema";
import type { MobileUserProfileResponse } from "./types";

export type MobileUserProfileResult =
  | { ok: true; data: MobileUserProfileResponse }
  | { ok: false; status: 404; notFound: true }
  | { ok: false; status: 422; dataQuality: true }
  | { ok: false; status: number; message: string };

function isExactErrorPayload(payload: unknown, error: string): boolean {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  return Object.keys(record).length === 1 && record.error === error;
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
          isExactErrorPayload(payload, "user not found")
        ) {
          return { ok: false, status: 404, notFound: true };
        }
        if (
          response.status === 422 &&
          isExactErrorPayload(
            payload,
            "mobile reporting data integrity issue"
          )
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
