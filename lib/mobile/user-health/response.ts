import { mobileUserHealthSchema } from "./schema";
import type { MobileUserHealthResponse } from "./types";

export type MobileUserHealthResult =
  | { ok: true; data: MobileUserHealthResponse }
  | { ok: false; status: number; message: string };

export async function decodeMobileUserHealthResponse(
  response: Response
): Promise<MobileUserHealthResult> {
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message:
        response.status === 400
          ? "The selected health-board filters are invalid."
          : "The onboarding health service could not return user data.",
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      message: "The onboarding health service returned an unexpected format.",
    };
  }

  const parsed = mobileUserHealthSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      status: 502,
      message: "The onboarding health service returned an unexpected format.",
    };
  }
  return { ok: true, data: parsed.data };
}
