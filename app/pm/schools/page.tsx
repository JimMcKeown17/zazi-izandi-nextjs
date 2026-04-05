import { getSchoolPerformanceRows } from "@/lib/pm/api";
import { parseCohort, filterSchoolsByCohort, getCohortLabel } from "@/lib/pm/cohorts";
import { SchoolsClient } from "./schools-client";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PMSchoolsPage({ searchParams }: Props) {
  const params = await searchParams;
  const cohort = parseCohort(params.cohort as string | undefined);

  const allSchools = await getSchoolPerformanceRows();
  const filteredSchools = filterSchoolsByCohort(allSchools, cohort);
  const cohortLabel = getCohortLabel(cohort);

  return (
    <SchoolsClient
      schools={filteredSchools}
      cohortLabel={cohortLabel}
      totalSchools={allSchools.length}
    />
  );
}
