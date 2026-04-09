"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface GradeFilterProps {
  grades: string[];
  selected: string;
}

export function GradeFilter({ grades, selected }: GradeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(grade: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (grade === "Grade 1") {
      params.delete("grade");
    } else {
      params.set("grade", grade);
    }
    router.push(`/pm/assessments?${params.toString()}`);
  }

  const options = ["all", ...grades];

  return (
    <div className="flex items-center gap-1">
      {options.map((grade) => {
        const label = grade === "all" ? "All" : grade.replace("Grade ", "Gr ");
        const isActive = grade === selected;
        return (
          <button
            key={grade}
            onClick={() => handleChange(grade)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              isActive
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
