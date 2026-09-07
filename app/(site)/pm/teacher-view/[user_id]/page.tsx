import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getTeacherClassroom } from "@/lib/teacher/api";
import { ClassroomHeader } from "@/components/teacher/classroom-header";
import { ClassroomView } from "@/components/teacher/classroom-view";
import { PrintButton } from "@/components/teacher/print-button";
import { PrintHeader } from "@/components/teacher/print-header";

interface Params {
  user_id: string;
}

export default async function TeacherViewDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const userIdNum = Number(resolved.user_id);
  if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
    redirect("/pm/teacher-view");
  }

  const result = await getTeacherClassroom([userIdNum]);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/pm/teacher-view"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to classroom search
        </Link>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4">
          <h1 className="text-sm font-semibold text-amber-800">
            Data is not available
          </h1>
          <p className="mt-1 text-xs text-amber-700">
            Couldn&apos;t load classroom data for EA {userIdNum}. The backend
            may be temporarily unavailable, or this EA may not have any group
            data.
          </p>
        </div>
      </div>
    );
  }

  const { data, groupSessions } = result;

  return (
    <div className="space-y-4">
      <PrintHeader summary={data} />

      <div className="flex items-start justify-between gap-4 print:hidden">
        <Link
          href="/pm/teacher-view"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to classroom search
        </Link>
        <PrintButton />
      </div>

      <div className="print:hidden">
        <h1 className="text-lg font-semibold text-slate-900">
          Viewing as: {data.teacher_display_name}
        </h1>
        <p className="text-xs text-slate-500">
          This is exactly what the teacher for this classroom would see at{" "}
          <code className="font-mono text-slate-600">/my-classroom</code>.
        </p>
      </div>

      <div className="print:hidden">
        <ClassroomHeader summary={data} />
      </div>
      <ClassroomView summary={data} groupSessions={groupSessions} />
    </div>
  );
}
