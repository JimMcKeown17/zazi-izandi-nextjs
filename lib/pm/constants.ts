export const DOSAGE_THRESHOLDS = {
  ON_TRACK: 3,
  NEEDS_ATTENTION: 2,
} as const;

export function getDosageLevel(avg: number): "on_track" | "needs_attention" | "low" {
  if (avg >= DOSAGE_THRESHOLDS.ON_TRACK) return "on_track";
  if (avg >= DOSAGE_THRESHOLDS.NEEDS_ATTENTION) return "needs_attention";
  return "low";
}

export const DOSAGE_COLORS = {
  on_track: {
    bg: "bg-green-50",
    border: "border-green-500",
    text: "text-green-700",
    fill: "#22c55e",
    label: "On Track",
  },
  needs_attention: {
    bg: "bg-yellow-50",
    border: "border-yellow-500",
    text: "text-yellow-700",
    fill: "#f59e0b",
    label: "Needs Attention",
  },
  low: {
    bg: "bg-red-50",
    border: "border-red-500",
    text: "text-red-700",
    fill: "#e74c3c",
    label: "Low Dosage",
  },
} as const;

export const HEALTH_STATUS_CONFIG = {
  healthy: {
    label: "HEALTHY",
    bg: "bg-green-500",
    dot: "text-green-400",
  },
  needs_attention: {
    label: "NEEDS ATTENTION",
    bg: "bg-amber-500",
    dot: "text-amber-400",
  },
  action_required: {
    label: "ACTION REQUIRED",
    bg: "bg-red-500",
    dot: "text-red-400",
  },
} as const;

export const LETTER_SEQUENCE = [
  "a","e","i","o","u","b","l","m","k","p",
  "s","h","z","n","d","y","f","w","v","x",
  "g","t","q","r","c","j",
] as const;

export const CHART_COLORS = {
  primary: "#2c5aa0",
  primaryLight: "#60a5fa",
  ecd: "#8b5cf6",
  total: "#22c55e",
  grid: "#e2e8f0",
  text: "#64748b",
} as const;
