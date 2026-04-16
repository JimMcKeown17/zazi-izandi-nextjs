import { getEaOverview, getGroupDetail } from "@/lib/ea/api";
import type { EaGroupDetail } from "@/lib/ea/types";
import type { ClassroomSummary } from "./types";
import { aggregateGroupsToClassroom } from "./aggregate";

export type ClassroomResult =
  | { ok: true; data: ClassroomSummary }
  | { ok: false; error: string };

export async function getTeacherClassroom(
  teampactUserIds: number[],
  teacherName?: string
): Promise<ClassroomResult> {
  if (teampactUserIds.length === 0) {
    return { ok: false, error: "no teampact_user_ids provided" };
  }

  const userId = teampactUserIds[0];

  const overview = await getEaOverview(userId);
  if (!overview.ok) {
    return { ok: false, error: overview.error };
  }

  const groupDetails: EaGroupDetail[] = [];
  for (const group of overview.data.groups) {
    if (group.class_id == null) continue;
    const detail = await getGroupDetail(userId, group.class_id);
    if (detail.ok) {
      groupDetails.push(detail.data);
    }
  }

  if (groupDetails.length === 0) {
    return { ok: false, error: "no group data available" };
  }

  const summary = aggregateGroupsToClassroom(groupDetails, {
    teacher_name: teacherName,
  });

  return { ok: true, data: summary };
}
