import type { ClassroomSummary } from "@/lib/teacher/types";

interface Props {
  summary: ClassroomSummary;
}

export function ClassroomHeader({ summary }: Props) {
  return (
    <div className="rounded-lg bg-slate-900 px-6 py-4 text-white">
      <h1 className="text-lg font-bold">
        {summary.teacher_display_name}&apos;s Classroom
      </h1>
      <p className="mt-1 text-sm text-slate-300">
        {summary.school_name} · {summary.grade} · {summary.language} ·{" "}
        {summary.children_count}{" "}
        {summary.children_count === 1 ? "child" : "children"}
      </p>
    </div>
  );
}
