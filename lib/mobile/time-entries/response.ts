import { mobileTimeEntriesActivitySchema } from "./schema";
import type { MobileTimeEntriesActivityResponse } from "./types";

export type MobileTimeEntriesActivityResult =
  | { ok: true; data: MobileTimeEntriesActivityResponse }
  | { ok: false; status: number; message: string };

export async function decodeMobileTimeEntriesActivityResponse(
  response: Response
): Promise<MobileTimeEntriesActivityResult> {
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message:
        response.status === 400
          ? "The selected clock-report filters are invalid."
          : "The mobile-app report service could not return clock data.",
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      message: "The clock report returned an unexpected data format.",
    };
  }

  const parsed = mobileTimeEntriesActivitySchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      status: 502,
      message: "The clock report returned an unexpected data format.",
    };
  }

  return { ok: true, data: parsed.data };
}
