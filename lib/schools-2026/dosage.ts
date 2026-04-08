// lib/schools-2026/dosage.ts

export type DosageLevel = "green" | "yellow" | "red";

/**
 * Type-aware dosage thresholds:
 *   Primary: green ≥2, yellow 1–2, red <1
 *   ECD:     green ≥3, yellow 2–3, red <2
 */
export function getDosageLevel(
  avg: number,
  schoolType: string
): DosageLevel {
  const isECD = schoolType === "ECD";
  const greenThreshold = isECD ? 3 : 2;
  const yellowThreshold = isECD ? 2 : 1;

  if (avg >= greenThreshold) return "green";
  if (avg >= yellowThreshold) return "yellow";
  return "red";
}

export const DOSAGE_LABELS: Record<DosageLevel, string> = {
  green: "On Track",
  yellow: "Needs Attention",
  red: "Low Dosage",
};
