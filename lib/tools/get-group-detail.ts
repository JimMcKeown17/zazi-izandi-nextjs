/**
 * `getGroupDetail` tool for the EA AI assistant.
 *
 * The LLM calls this when it needs per-child mastery, per-letter breakdown,
 * or recent session detail for a specific group. The class_id is drawn from
 * the system-prompt snapshot, so there is no fuzzy name matching.
 *
 * Scoping: the `teampact_user_id` is captured by closure — the LLM cannot
 * override it. Attempting to look up a class_id belonging to a different EA
 * returns `{ error: "group_not_found" }`.
 *
 * Payload scrubbing: participant_ids are stripped before returning to the
 * model, per the PII-scope decision in the implementation plan.
 */
import { tool } from "ai";
import { z } from "zod";

import { getGroupDetail } from "@/lib/ea/api";
import type { EaGroupDetail } from "@/lib/ea/types";

function toAiSafeGroupDetail(detail: EaGroupDetail) {
  return {
    class_id: detail.class_id,
    group_name: detail.group_name,
    school_name: detail.school_name,
    grade: detail.grade,
    phase: detail.phase,
    language: detail.language,
    progress: detail.progress,
    avg_sessions_per_week: detail.avg_sessions_per_week,
    sessions_this_week: detail.sessions_this_week,
    total_sessions: detail.total_sessions,
    children_count: detail.children_count,
    flags: detail.flags,
    // Strip participant_id from each child; keep first-name token only
    children: detail.children.map((c) => ({
      name: firstNameOnly(c.name),
      sessions_attended: c.sessions_attended,
      sessions_total: c.sessions_total,
      attendance_rate: c.attendance_rate,
      last_attended: c.last_attended,
      letters_total_correct: c.letters_total_correct,
      alignment: c.alignment
        ? {
            letters_skipped: c.alignment.letters_skipped,
            teaching_known_letters: c.alignment.teaching_known_letters,
            alignment_score: c.alignment.alignment_score,
            flag_teaching_known: c.alignment.flag_teaching_known,
            flag_skipping_needed: c.alignment.flag_skipping_needed,
          }
        : null,
    })),
    recent_sessions: detail.recent_sessions.map((s) => ({
      date: s.date,
      letters_taught: s.letters_taught,
      attendance_count: s.attendance_count,
      attendance_total: s.attendance_total,
      notes: s.notes,
    })),
    letter_mastery: detail.letter_mastery,
  };
}

function firstNameOnly(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
}

export function createGetGroupDetailTool(teampactUserId: number) {
  return tool({
    description:
      "Fetch per-child mastery, per-letter breakdown, and recent session detail for a specific group the EA owns. Use when the EA asks about a specific group, or when you need child-level data to give a concrete plan. The class_id must come from the snapshot in the system prompt.",
    inputSchema: z.object({
      class_id: z
        .number()
        .int()
        .positive()
        .describe("class_id of the group from the EA snapshot"),
    }),
    execute: async ({ class_id }) => {
      const result = await getGroupDetail(teampactUserId, class_id);
      if (!result.ok) {
        return {
          error:
            result.error === "group not found" ? "group_not_found" : "unavailable",
        };
      }
      return toAiSafeGroupDetail(result.data);
    },
  });
}
