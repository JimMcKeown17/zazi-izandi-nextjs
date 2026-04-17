import Image from "next/image";
import type { ClassroomSummary } from "@/lib/teacher/types";

interface Props {
  summary: ClassroomSummary;
}

export function PrintHeader({ summary }: Props) {
  const printDate = new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div
      data-print-only
      className="hidden print:flex print:items-center print:justify-between print:gap-6 print:pb-3 print:mb-4 print:border-b-2 print:border-primary"
    >
      <div className="flex items-center gap-3">
        <Image
          src="/zazi_izandi_logo.png"
          alt="Zazi iZandi"
          width={120}
          height={40}
          className="h-10 w-auto"
          priority
        />
      </div>

      <div className="flex-1 text-center">
        <div className="text-sm font-semibold text-slate-900">
          {summary.teacher_display_name}
        </div>
        <div className="text-xs text-slate-600">
          {summary.school_name} · {summary.grade} · {summary.language}
        </div>
      </div>

      <div className="text-right text-xs text-slate-600">
        <div className="font-medium text-slate-800">Printed</div>
        <div>{printDate}</div>
      </div>
    </div>
  );
}
