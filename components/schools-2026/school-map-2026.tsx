"use client";

import SchoolMap from "@/components/schools/school-map";
import { getDosageLevel, DOSAGE_LABELS } from "@/lib/schools-2026/dosage";
import type { EnrichedSchool2026 } from "@/lib/schools-2026/types";

interface SchoolMap2026Props {
  schools: EnrichedSchool2026[];
}

const DOSAGE_TO_PERFORMANCE: Record<string, string> = {
  green: "high",
  yellow: "good",
  red: "low",
};

const PERFORMANCE_COLORS: Record<string, string> = {
  high: "#10b981",
  good: "#f59e0b",
  low: "#ef4444",
};

function renderPopupHtml(props: Record<string, unknown>): string {
  const perfColor = PERFORMANCE_COLORS[props.performance as string] ?? "#2c5aa0";
  const perfLabel = DOSAGE_LABELS[
    ({ high: "green", good: "yellow", low: "red" }[props.performance as string] ?? "red") as "green" | "yellow" | "red"
  ];

  return `
    <div style="padding: 12px; min-width: 200px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 15px; font-weight: bold; color: #1f2937;">
          ${props.name || "Unknown School"}
        </h3>
        <span style="background: ${perfColor}; color: white; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px;">
          ${perfLabel}
        </span>
      </div>
      <div style="font-size: 13px; color: #6b7280; line-height: 1.6;">
        <p style="margin: 4px 0;"><strong>Type:</strong> ${props.phase}</p>
        <p style="margin: 4px 0;"><strong>Children:</strong> ${props.grR}</p>
        <p style="margin: 4px 0;"><strong>EAs:</strong> ${props.years}</p>
      </div>
    </div>
  `;
}

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
      <SchoolMap schools={mapSchools} renderPopupHtml={renderPopupHtml} />
    </div>
  );
}
