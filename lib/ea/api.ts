import { cache } from "react";
import { djangoFetch } from "@/lib/django-fetch";
import type {
  AiUsageCounter,
  ChatMessage,
  DailyBrief,
  EaAiSnapshot,
  EaGroupDetail,
  EaOverviewResponse,
} from "./types";

export type EaOverviewResult =
  | { ok: true; data: EaOverviewResponse }
  | { ok: false; error: string };

export const getEaOverview = cache(
  async (userId: number): Promise<EaOverviewResult> => {
    try {
      const res = await djangoFetch(`/api/ea/${userId}/`, {
        cache: "no-store",
      });

      if (!res.ok) {
        return { ok: false, error: `Django returned ${res.status}` };
      }

      const data: EaOverviewResponse = await res.json();
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
);

export type EaGroupDetailResult =
  | { ok: true; data: EaGroupDetail }
  | { ok: false; error: string; status?: number };

export const getGroupDetail = cache(
  async (
    userId: number,
    classId: number,
  ): Promise<EaGroupDetailResult> => {
    try {
      const res = await djangoFetch(
        `/api/ea/${userId}/groups/${classId}/`,
        { cache: "no-store" },
      );

      if (res.status === 404) {
        return { ok: false, error: "group not found", status: 404 };
      }

      if (!res.ok) {
        return {
          ok: false,
          error: `Django returned ${res.status}`,
          status: res.status,
        };
      }

      const data: EaGroupDetail = await res.json();
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },
);

// --- AI Assistant read helpers ---

export type EaAiSnapshotResult =
  | { ok: true; data: EaAiSnapshot }
  | { ok: false; error: string };

export const getAiSnapshot = cache(
  async (userId: number): Promise<EaAiSnapshotResult> => {
    try {
      const res = await djangoFetch(`/api/ea/${userId}/ai-snapshot/`, {
        cache: "no-store",
      });
      if (!res.ok) {
        return { ok: false, error: `Django returned ${res.status}` };
      }
      const data: EaAiSnapshot = await res.json();
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },
);

export const getTodaysBrief = cache(
  async (userId: number): Promise<DailyBrief | null> => {
    try {
      const res = await djangoFetch(`/api/ea/${userId}/brief/today/`, {
        cache: "no-store",
      });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return (await res.json()) as DailyBrief;
    } catch {
      return null;
    }
  },
);

export const getTodaysChatMessages = cache(
  async (userId: number): Promise<ChatMessage[]> => {
    try {
      const res = await djangoFetch(
        `/api/ea/${userId}/chat/messages/today/`,
        { cache: "no-store" },
      );
      if (!res.ok) return [];
      const payload = (await res.json()) as { messages?: ChatMessage[] };
      return payload.messages ?? [];
    } catch {
      return [];
    }
  },
);

export const getUsageToday = cache(
  async (userId: number): Promise<AiUsageCounter | null> => {
    try {
      const res = await djangoFetch(`/api/ea/${userId}/usage/today/`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as AiUsageCounter;
    } catch {
      return null;
    }
  },
);
