"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { COHORT_OPTIONS, type Cohort } from "@/lib/pm/cohorts";

interface CohortSelectorProps {
  currentCohort: Cohort;
}

export function CohortSelector({ currentCohort }: CohortSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cohort", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={currentCohort}
      onChange={handleChange}
      className="bg-slate-700 text-white text-xs rounded border border-slate-600 px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-yellow/60 shrink-0"
      aria-label="Select cohort"
    >
      {COHORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label} — {opt.description}
        </option>
      ))}
    </select>
  );
}
