/**
 * Django write-path helpers for the AI assistant.
 *
 * These are NOT React.cache wrapped — they mutate state in the Django DB
 * (reserve brief slot, persist chat messages, complete brief rows).
 * Every call is server-side only and goes through `djangoPost` which
 * attaches the `X-Internal-Auth` shared-secret header.
 *
 * The 429 path is meaningful: Django uses `select_for_update` + counter
 * increment to atomically enforce per-EA-per-day caps. A 429 means the
 * EA has hit their daily cap; the Next.js layer should surface that to
 * the UI rather than retry.
 */
import { djangoPost } from "@/lib/django-fetch";

export type ReserveBriefResult =
  | { ok: true; brief_id: number; generation_index: number }
  | {
      ok: false;
      error: string;
      status?: number;
      cap?: number;
      current?: number;
    };

export async function reserveBriefSlot(
  teampactUserId: number,
  body: { model: string; prompt_json: unknown },
): Promise<ReserveBriefResult> {
  try {
    const res = await djangoPost(
      `/api/ea/${teampactUserId}/brief/`,
      body,
    );
    if (res.status === 429) {
      const payload = (await res.json()) as {
        error?: string;
        cap?: number;
        current?: number;
      };
      return {
        ok: false,
        error: payload.error ?? "rate_limit_exceeded",
        status: 429,
        cap: payload.cap,
        current: payload.current,
      };
    }
    if (!res.ok) {
      return { ok: false, error: `Django returned ${res.status}`, status: res.status };
    }
    const data = (await res.json()) as { brief_id: number; generation_index: number };
    return { ok: true, brief_id: data.brief_id, generation_index: data.generation_index };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function completeBrief(
  teampactUserId: number,
  briefId: number,
  body: {
    content: string;
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    cost_usd_cents?: number | null;
  },
): Promise<void> {
  try {
    await djangoPost(
      `/api/ea/${teampactUserId}/brief/${briefId}/complete/`,
      body,
    );
  } catch (err) {
    // Completion is best-effort — do not throw. The partial row remains
    // and a sweeper cron (phase 2) can reconcile.
    console.error("completeBrief failed:", err);
  }
}

export type AppendChatResult =
  | { ok: true; message_id: number }
  | {
      ok: false;
      error: string;
      status?: number;
      cap?: number;
      current?: number;
    };

export async function appendChatMessage(
  teampactUserId: number,
  body: {
    role: "user" | "assistant";
    content: string;
    model?: string;
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    cost_usd_cents?: number | null;
    prompt_json?: unknown;
    tool_calls?: unknown;
  },
): Promise<AppendChatResult> {
  try {
    const res = await djangoPost(
      `/api/ea/${teampactUserId}/chat/messages/`,
      body,
    );
    if (res.status === 429) {
      const payload = (await res.json()) as {
        error?: string;
        cap?: number;
        current?: number;
      };
      return {
        ok: false,
        error: payload.error ?? "rate_limit_exceeded",
        status: 429,
        cap: payload.cap,
        current: payload.current,
      };
    }
    if (!res.ok) {
      return { ok: false, error: `Django returned ${res.status}`, status: res.status };
    }
    const data = (await res.json()) as { message_id: number };
    return { ok: true, message_id: data.message_id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
