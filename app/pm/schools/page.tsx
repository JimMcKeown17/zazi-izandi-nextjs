import { getSchoolPerformanceRows } from "@/lib/pm/api";
import { SchoolsClient } from "./schools-client";

export default async function PMSchoolsPage() {
  const schools = await getSchoolPerformanceRows();

  return <SchoolsClient schools={schools} />;
}
