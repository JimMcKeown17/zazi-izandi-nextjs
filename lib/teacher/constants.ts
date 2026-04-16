export const BENCHMARK_THRESHOLDS: Record<string, number> = {
  "Grade 1": 40,
  "Grade R": 15,
};

export const DEFAULT_BENCHMARK = 40;

export const LPM_BANDS = {
  RED_MAX: 9,
  YELLOW_MAX: 39,
} as const;

export function getLpmBand(
  lpm: number,
  benchmark: number
): "met" | "approaching" | "low" {
  if (lpm >= benchmark) return "met";
  if (lpm >= 10) return "approaching";
  return "low";
}

export const LPM_BAND_COLORS = {
  met: { fill: "#10b981", text: "text-green-700", label: "Met benchmark" },
  approaching: { fill: "#f59e0b", text: "text-yellow-700", label: "Approaching" },
  low: { fill: "#ef4444", text: "text-red-700", label: "Needs support" },
} as const;

export const ASSESSMENT_CYCLE_LABELS: Record<string, string> = {
  baseline: "Feb 2026",
  midline: "Jun 2026",
  endline: "Oct 2026",
};
