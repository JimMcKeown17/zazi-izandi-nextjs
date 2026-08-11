import { mobileSessionsActivitySchema } from "./schema";
import type { MobileSessionsActivityResponse } from "./types";

export type MobileSessionsActivityResult =
  | { ok: true; data: MobileSessionsActivityResponse }
  | { ok: false; status: number; message: string };

export async function decodeMobileSessionsActivityResponse(
  response: Response
): Promise<MobileSessionsActivityResult> {
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message:
        response.status === 400
          ? "The selected report filters are invalid."
          : "The mobile-app report service could not return session data.",
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      message: "The mobile-app report returned an unexpected data format.",
    };
  }

  const parsed = mobileSessionsActivitySchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      status: 502,
      message: "The mobile-app report returned an unexpected data format.",
    };
  }

  return { ok: true, data: parsed.data };
}
