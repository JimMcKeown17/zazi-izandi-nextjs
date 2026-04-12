import { cache } from "react";
import { djangoFetch } from "@/lib/django-fetch";
import type { EaOverviewResponse } from "./types";

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
