import type {
  EAPerformanceHistoryResponse,
  EAPerformanceItem,
  EATrajectory,
} from "./types";

export function eaIdentity(
  ea: Pick<EAPerformanceItem | EATrajectory, "ea_key" | "ea_user_id" | "ea_name">
): string {
  if (ea.ea_user_id !== null) return `id:${ea.ea_user_id}`;
  return ea.ea_key || `name:${ea.ea_name}`;
}

export function stableEAKeys(
  current: EAPerformanceItem[],
  history: EAPerformanceHistoryResponse
): string[] {
  return [
    ...new Set([
      ...current.map(eaIdentity),
      ...history.eas.map(eaIdentity),
    ]),
  ].sort();
}

export function indexCurrentEAs(current: EAPerformanceItem[]) {
  return new Map(current.map((ea) => [eaIdentity(ea), ea]));
}

export function indexHistoricalEAs(history: EAPerformanceHistoryResponse) {
  return new Map(history.eas.map((ea) => [eaIdentity(ea), ea]));
}
