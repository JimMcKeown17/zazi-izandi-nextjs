import { mobileUserProfileSchema } from "./schema";
import type { MobileUserProfileResponse } from "./types";

export type MobileUserProfileResult =
  | { ok: true; data: MobileUserProfileResponse }
  | { ok: false; status: 404; notFound: true }
  | { ok: false; status: number; message: string };

function isExactNotFoundPayload(payload: unknown): boolean {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  return (
    Object.keys(record).length === 1 && record.error === "user not found"
  );
}

export async function decodeMobileUserProfileResponse(
  response: Response
): Promise<MobileUserProfileResult> {
  if (!response.ok) {
    if (response.status === 404) {
      try {
        if (isExactNotFoundPayload(await response.json())) {
          return { ok: false, status: 404, notFound: true };
        }
      } catch {
        // A route-level HTML or empty 404 is a service failure, not user absence.
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
