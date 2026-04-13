import { cache } from "react";
import { djangoFetch } from "@/lib/django-fetch";
import type { EaOverviewResponse, EaGroupDetail } from "./types";

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
