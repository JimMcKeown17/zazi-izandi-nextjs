"use client";

import SchoolMap from "@/components/schools/school-map";
import { getDosageLevel } from "@/lib/schools-2026/dosage";
import type { EnrichedSchool2026 } from "@/lib/schools-2026/types";

interface SchoolMap2026Props {
  schools: EnrichedSchool2026[];
}

const DOSAGE_TO_PERFORMANCE: Record<string, string> = {
  green: "high",
  yellow: "good",
  red: "low",
};

/**
 * Adapter that converts EnrichedSchool2026[] to the format
 * expected by the 2025 SchoolMap component.
 */
export default function SchoolMap2026({ schools }: SchoolMap2026Props) {
  const mapSchools = schools
    .filter((s) => s.latitude !== null && s.longitude !== null)
    .map((school) => {
      const level = getDosageLevel(
        school.avg_sessions_per_group_per_week,
        school.school_type
      );

      return {
        NatEmis: null,
        Official_Institution_Name: school.school_name,
        Matched_GPS_Coordinates: `${school.latitude}, ${school.longitude}`,
        Matched_Area: null,
        CMC: null,
        EICircuit: null,
        Phase_PED: school.school_type,
        "Gr R": school.children_count,
        "Gr 1": null,
        "Year(s) on the Programme": `${school.ea_count} EAs`,
        performance: DOSAGE_TO_PERFORMANCE[level],
      };
    });

  if (mapSchools.length === 0) return null;

  return (
    <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
      <SchoolMap schools={mapSchools} />
    </div>
  );
}
