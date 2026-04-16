import type { EaGroupDetail } from "@/lib/ea/types";
import type {
  ClassroomSummary,
  ClassroomChild,
  ClassroomLetterCell,
  ClassroomAlignment,
} from "./types";
import { LETTER_SEQUENCES, DEFAULT_LANGUAGE } from "@/lib/pm/constants";
import {
  BENCHMARK_THRESHOLDS,
  DEFAULT_BENCHMARK,
  ASSESSMENT_CYCLE_LABELS,
} from "./constants";

function mode<T>(arr: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of arr) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | undefined;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

export function aggregateGroupsToClassroom(
  groups: EaGroupDetail[],
  meta: { teacher_name?: string }
): ClassroomSummary {
  const allChildren = new Map<number, ClassroomChild>();
  const letterMasteryAccum = new Map<
    string,
    { mastered: number; total: number; sessions: number }
  >();
  let totalSessions = 0;

  const grades = groups.map((g) => g.grade);
  const languages = groups.map((g) => g.language);
  const schools = groups.map((g) => g.school_name);

  const detectedGrade = mode(grades) ?? "Grade 1";
  const detectedLanguage = mode(languages) ?? DEFAULT_LANGUAGE;
  const detectedSchool = mode(schools) ?? "";
  const letterSequence =
    LETTER_SEQUENCES[detectedLanguage] ??
    LETTER_SEQUENCES[DEFAULT_LANGUAGE];
  const benchmark =
    BENCHMARK_THRESHOLDS[detectedGrade] ?? DEFAULT_BENCHMARK;

  for (const group of groups) {
    totalSessions += group.total_sessions;

    for (const child of group.children) {
      if (!allChildren.has(child.participant_id)) {
        allChildren.set(child.participant_id, {
          participant_id: child.participant_id,
          name: child.name,
          letters_total_correct: child.letters_total_correct ?? null,
          sessions_attended: child.sessions_attended,
          sessions_total: child.sessions_total,
          attendance_rate: child.attendance_rate,
        });
      }
    }

    for (const lm of group.letter_mastery) {
      const existing = letterMasteryAccum.get(lm.letter);
      if (existing) {
        existing.mastered += lm.children_mastered;
        existing.total += lm.children_total;
        existing.sessions += lm.sessions_taught;
      } else {
        letterMasteryAccum.set(lm.letter, {
          mastered: lm.children_mastered,
          total: lm.children_total,
          sessions: lm.sessions_taught,
        });
      }
    }
  }

  const children = Array.from(allChildren.values());

  const assessed = children.filter((c) => c.letters_total_correct !== null);
  const assessedCount = assessed.length;
  const avgLpm =
    assessedCount > 0
      ? assessed.reduce((sum, c) => sum + (c.letters_total_correct ?? 0), 0) /
        assessedCount
      : 0;
  const pctHittingBenchmark =
    assessedCount > 0
      ? (assessed.filter((c) => (c.letters_total_correct ?? 0) >= benchmark)
          .length /
          assessedCount) *
        100
      : 0;
  const pctZeroLetter =
    assessedCount > 0
      ? (assessed.filter((c) => c.letters_total_correct === 0).length /
          assessedCount) *
        100
      : 0;
  const avgAttendance =
    children.length > 0
      ? children.reduce((sum, c) => sum + c.attendance_rate, 0) /
        children.length
      : 0;

  const letterGrid: ClassroomLetterCell[] = letterSequence.map((letter) => {
    const accum = letterMasteryAccum.get(letter);
    if (!accum || accum.total === 0) {
      return {
        letter,
        children_mastered: 0,
        children_total: 0,
        mastery_pct: 0,
        sessions_taught: accum?.sessions ?? 0,
      };
    }
    return {
      letter,
      children_mastered: accum.mastered,
      children_total: accum.total,
      mastery_pct: Math.round((accum.mastered / accum.total) * 100),
      sessions_taught: accum.sessions,
    };
  });

  let alignment: ClassroomAlignment | null = null;
  const childrenWithAlignment = children.filter(
    (c) =>
      allChildren.get(c.participant_id) !== undefined &&
      groups.some((g) =>
        g.children.some(
          (gc) =>
            gc.participant_id === c.participant_id && gc.alignment !== null
        )
      )
  );

  if (childrenWithAlignment.length > 0) {
    let totalScore = 0;
    let totalSkipped = 0;
    let totalTeachingKnown = 0;
    let anySkipping = false;
    let anyTeachingKnown = false;

    for (const group of groups) {
      for (const gc of group.children) {
        if (!gc.alignment) continue;
        totalScore += gc.alignment.alignment_score;
        totalSkipped += gc.alignment.letters_skipped.length;
        totalTeachingKnown += gc.alignment.teaching_known_letters.length;
        if (gc.alignment.flag_skipping_needed) anySkipping = true;
        if (gc.alignment.flag_teaching_known) anyTeachingKnown = true;
      }
    }

    const alignedChildren = groups.reduce(
      (count, g) =>
        count + g.children.filter((gc) => gc.alignment !== null).length,
      0
    );

    alignment = {
      score: alignedChildren > 0 ? Math.round(totalScore / alignedChildren) : 0,
      letters_on_target: Math.max(
        0,
        letterGrid.filter((l) => l.sessions_taught > 0).length -
          totalSkipped -
          totalTeachingKnown
      ),
      letters_skipped: totalSkipped,
      letters_teaching_known: totalTeachingKnown,
      flag_skipping_needed: anySkipping,
      flag_teaching_known: anyTeachingKnown,
    };
  }

  const lastSessionDates = groups
    .map((g) => {
      const sessions = g.recent_sessions;
      return sessions.length > 0 ? sessions[0].date : null;
    })
    .filter((d): d is string => d !== null);
  const lastSessionDate =
    lastSessionDates.length > 0
      ? lastSessionDates.sort().reverse()[0]
      : null;

  return {
    teacher_display_name: meta.teacher_name ?? "Teacher",
    school_name: detectedSchool,
    grade: detectedGrade,
    language: detectedLanguage,
    children_count: children.length,
    assessed_count: assessedCount,
    benchmark_threshold: benchmark,
    pct_hitting_benchmark: Math.round(pctHittingBenchmark * 10) / 10,
    pct_zero_letter: Math.round(pctZeroLetter * 10) / 10,
    avg_lpm: Math.round(avgLpm * 10) / 10,
    letter_sequence: [...letterSequence],
    letter_grid: letterGrid,
    children,
    alignment,
    total_sessions: totalSessions,
    avg_attendance: Math.round(avgAttendance * 100) / 100,
    last_session_date: lastSessionDate,
    assessment_cycle: "baseline",
    assessment_date_label: ASSESSMENT_CYCLE_LABELS["baseline"],
  };
}
