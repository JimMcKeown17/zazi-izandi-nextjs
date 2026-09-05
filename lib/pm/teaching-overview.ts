import type {
  ProgrammeFidelityRow,
  ProgrammeFidelityRowV2,
} from "@/lib/mobile/programme-fidelity/types";

export type LetterFocusAvailability =
  | "calculated"
  | "not_calculated_for_run"
  | "not_enough_reliable_evidence";

export interface TeachingOverviewPortfolio {
  eaUserId: string;
  eaDisplayName: string;
  schoolLabels: string[];
  currentGroupCount: number;
  activeGroupCount: number;
  inactiveGroupCount: number;
  totalRecentSessions: number;
  averageRecentSessionsPerGroup: number;
  rosterSize: number;
  trackerStartedCount: number;
  trackerCoverage: number | null;
  lowTrackerGroupCount: number;
  aheadEvidenceGroupCount: number;
  recentUnscorableGroupCount: number | null;
  bootstrapInfluencedGroupCount: number;
  noImmediateFlagGroupCount: number;
  focusedSessionCount: number | null;
  mixedSessionCount: number | null;
  aheadOnlySessionCount: number | null;
  eligibleSessionCount: number | null;
  unscoredSessionCount: number | null;
  causalSessionCount: number | null;
  bootstrapSessionCount: number | null;
  usableGroupCount: number | null;
  letterFocusScore: number | null;
  letterFocusAvailability: LetterFocusAvailability;
  groups: ProgrammeFidelityRow[];
}

const cleanLabel = (value: string): string => value.trim().replace(/\s+/g, " ");
const normalizedLabel = (value: string): string => cleanLabel(value).toUpperCase();

const compareText = (left: string, right: string): number => {
  const normalizedLeft = normalizedLabel(left);
  const normalizedRight = normalizedLabel(right);
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const stableDistinctLabels = (values: Array<string | null>): string[] => {
  const labels = new Map<string, string>();
  for (const value of values) {
    if (value === null || cleanLabel(value) === "") continue;
    const cleaned = cleanLabel(value);
    const key = normalizedLabel(cleaned);
    const existing = labels.get(key);
    if (existing === undefined || compareText(cleaned, existing) < 0) {
      labels.set(key, cleaned);
    }
  }
  return [...labels.values()].sort(compareText);
};

const stableGroupOrder = (left: ProgrammeFidelityRow, right: ProgrammeFidelityRow): number =>
  compareText(left.school_name ?? "", right.school_name ?? "") ||
  compareText(left.group_name, right.group_name) ||
  (left.group_id < right.group_id ? -1 : left.group_id > right.group_id ? 1 : 0);

const sumNullable = (
  rows: ProgrammeFidelityRow[],
  select: (row: ProgrammeFidelityRow) => number | null
): number | null => {
  const values = rows.map(select);
  return values.some((value) => value === null)
    ? null
    : values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
};

export function buildTeachingOverviewPortfolios(
  rows: readonly ProgrammeFidelityRow[],
  schemaVersion: 1 | 2
): TeachingOverviewPortfolio[] {
  const currentRows = rows.filter((row) => row.is_current_owner);
  const grouped = new Map<string, ProgrammeFidelityRow[]>();
  for (const row of currentRows) {
    const group = grouped.get(row.ea_user_id);
    if (group) group.push(row);
    else grouped.set(row.ea_user_id, [row]);
  }

  const portfolios = [...grouped.entries()].map(([eaUserId, unsortedRows]) => {
    const eaRows = [...unsortedRows].sort(stableGroupOrder);
    const names = stableDistinctLabels(eaRows.map((row) => row.ea_display_name));
    const rosterSize = eaRows.reduce((sum, row) => sum + (row.roster_size ?? 0), 0);
    const trackerStartedCount = eaRows.reduce(
      (sum, row) => sum + (row.started_count ?? 0),
      0
    );
    const totalRecentSessions = eaRows.reduce(
      (sum, row) => sum + row.recent_session_count,
      0
    );
    const activeGroupCount = eaRows.filter((row) => row.recent_session_count > 0).length;

    const v2Rows = schemaVersion === 2
      ? (eaRows as ProgrammeFidelityRowV2[])
      : null;
    const allLetterFocusAvailable =
      v2Rows !== null && v2Rows.every((row) => row.letter_focus !== null);
    const letterFocusRows = allLetterFocusAvailable
      ? v2Rows.map((row) => row.letter_focus).filter((value) => value !== null)
      : null;
    const usableScores = letterFocusRows?.flatMap((value) =>
      value.score === null ? [] : [value.score]
    ) ?? null;

    const letterFocusAvailability: LetterFocusAvailability =
      schemaVersion === 1
        ? "not_calculated_for_run"
        : allLetterFocusAvailable
          ? "calculated"
          : "not_enough_reliable_evidence";

    return {
      eaUserId,
      eaDisplayName: names[0] ?? "Unknown EA",
      schoolLabels: stableDistinctLabels(eaRows.map((row) => row.school_name)),
      currentGroupCount: eaRows.length,
      activeGroupCount,
      inactiveGroupCount: eaRows.length - activeGroupCount,
      totalRecentSessions,
      averageRecentSessionsPerGroup: totalRecentSessions / eaRows.length,
      rosterSize,
      trackerStartedCount,
      trackerCoverage: rosterSize > 0 ? trackerStartedCount / rosterSize : null,
      lowTrackerGroupCount: eaRows.filter(
        (row) => row.primary_reason === "CURRENT_TRACKER_COVERAGE_LOW"
      ).length,
      aheadEvidenceGroupCount: eaRows.filter(
        (row) => row.above_count !== null && row.above_count > 0
      ).length,
      recentUnscorableGroupCount: letterFocusRows === null
        ? null
        : letterFocusRows.filter((value) => value.unscored_session_count > 0).length,
      bootstrapInfluencedGroupCount: eaRows.filter(
        (row) =>
          row.bootstrap_influenced_count !== null &&
          row.bootstrap_influenced_count > 0
      ).length,
      noImmediateFlagGroupCount: eaRows.filter(
        (row) => row.primary_reason === "NO_IMMEDIATE_FLAG"
      ).length,
      focusedSessionCount: letterFocusRows === null
        ? null
        : letterFocusRows.reduce((sum, value) => sum + value.focused_session_count, 0),
      mixedSessionCount: letterFocusRows === null
        ? null
        : letterFocusRows.reduce((sum, value) => sum + value.mixed_session_count, 0),
      aheadOnlySessionCount: letterFocusRows === null
        ? null
        : letterFocusRows.reduce((sum, value) => sum + value.ahead_only_session_count, 0),
      eligibleSessionCount: letterFocusRows === null
        ? null
        : letterFocusRows.reduce((sum, value) => sum + value.eligible_session_count, 0),
      unscoredSessionCount: letterFocusRows === null
        ? null
        : letterFocusRows.reduce((sum, value) => sum + value.unscored_session_count, 0),
      causalSessionCount: sumNullable(eaRows, (row) => row.causal_post_install_count),
      bootstrapSessionCount: sumNullable(
        eaRows,
        (row) => row.bootstrap_influenced_count
      ),
      usableGroupCount: usableScores === null ? null : usableScores.length,
      letterFocusScore:
        usableScores === null || usableScores.length === 0
          ? null
          : usableScores.reduce((sum, score) => sum + score, 0) / usableScores.length,
      letterFocusAvailability,
      groups: eaRows,
    } satisfies TeachingOverviewPortfolio;
  });

  return portfolios.sort(
    (left, right) => {
      const leftName = normalizedLabel(left.eaDisplayName);
      const rightName = normalizedLabel(right.eaDisplayName);
      if (leftName < rightName) return -1;
      if (leftName > rightName) return 1;
      return left.eaUserId < right.eaUserId
        ? -1
        : left.eaUserId > right.eaUserId
          ? 1
          : 0;
    }
  );
}
