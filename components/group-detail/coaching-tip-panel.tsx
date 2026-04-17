import { Users, Target } from "lucide-react";
import type { EaGroupDetail, EaChild, EaFlag } from "@/lib/ea/types";
import { sequenceIndex } from "@/lib/letter-sequences";
import { CoachingTip } from "./coaching-tip";

const SKIPPED_LETTERS_DISPLAY_CAP = 6;

const GROUP_FLAG_PRIORITY: EaFlag[] = [
  "ghost_group",
  "moving_too_fast",
  "curriculum_gaps",
  "stagnation",
];

function getChildrenWithTeachingKnown(children: EaChild[]): EaChild[] {
  return children.filter(
    (c) =>
      c.alignment?.flag_teaching_known &&
      (c.alignment?.teaching_known_letters.length ?? 0) > 0,
  );
}

function formatNameList(children: EaChild[], maxDisplay = 3): string {
  const names = children.map((c) => c.name).filter((n) => n);
  if (names.length === 0) return "";
  if (names.length <= maxDisplay) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  }
  const shown = names.slice(0, maxDisplay).join(", ");
  const remaining = names.length - maxDisplay;
  return `${shown}, and ${remaining} ${remaining === 1 ? "other" : "others"}`;
}

function unionLetters(
  children: EaChild[],
  field: "teaching_known_letters" | "letters_skipped",
  language?: string,
): string[] {
  const letters = new Set<string>();
  for (const c of children) {
    const list = c.alignment?.[field] ?? [];
    for (const l of list) letters.add(l.toLowerCase());
  }
  const idx = sequenceIndex(language);
  return Array.from(letters).sort(
    (a, b) => (idx[a] ?? 999) - (idx[b] ?? 999),
  );
}

interface CoachingTipPanelProps {
  group: EaGroupDetail;
}

export function CoachingTipPanel({ group }: CoachingTipPanelProps) {
  // PRIORITY 1: Curriculum coverage gap (strongest signal per the data doc).
  // Aggregate letters_skipped at the GROUP level — the gap is in the EA's
  // teaching coverage, which affects every assessed child the same way.
  // Frame as a group-level statement, not "N of X children".
  const groupSkippedLetters = unionLetters(
    group.children,
    "letters_skipped",
    group.language,
  );
  const hasCurriculumGap = groupSkippedLetters.length > 0;
  const displayedSkippedLetters = groupSkippedLetters.slice(
    0,
    SKIPPED_LETTERS_DISPLAY_CAP,
  );
  const extraSkippedCount = Math.max(
    groupSkippedLetters.length - displayedSkippedLetters.length,
    0,
  );

  // PRIORITY 2: Group-level flags (Phase 1B's CoachingTip renderer). All
  // applicable flags are shown, not just the top one (which is what the
  // overview card does).
  const groupFlags = GROUP_FLAG_PRIORITY.filter((f) => group.flags.includes(f));

  // When the curriculum gap tip above has already rendered with specific
  // skipped letters, suppress the generic curriculum_gaps flag tip below
  // to avoid two amber callouts saying essentially the same thing.
  // The other three group flags remain — they're semantically distinct.
  const groupFlagsToRender = hasCurriculumGap
    ? groupFlags.filter((f) => f !== "curriculum_gaps")
    : groupFlags;

  // PRIORITY 3: Drilling-known-letters (minor secondary signal per the data
  // doc — drilling known letters supports automaticity and is largely
  // harmless if only here and there). Frame gently and last.
  const teachingKnownKids = getChildrenWithTeachingKnown(group.children);

  const hasAnyTip =
    hasCurriculumGap ||
    groupFlags.length > 0 ||
    teachingKnownKids.length > 0;

  if (!hasAnyTip) return null;

  const total = group.children.length;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-900">
        Coaching suggestions
      </h2>

      {/* PRIORITY 1: Curriculum coverage gap (group-level) */}
      {hasCurriculumGap ? (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <Target
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <div>
            <p>
              <span className="font-semibold">
                Next letters to cover from the programme order:
              </span>{" "}
              <span className="font-semibold">
                {displayedSkippedLetters.join(", ")}
              </span>
              {extraSkippedCount > 0
                ? ` (and ${extraSkippedCount} more)`
                : ""}
              .
            </p>
            <p className="mt-1">
              These come before your current position in the programme
              sequence. Work through them left-to-right before moving
              forward.
            </p>
          </div>
        </div>
      ) : null}

      {/* PRIORITY 2: Group-level flag tips (curriculum_gaps suppressed when curriculum gap tip above already fires) */}
      {groupFlagsToRender.map((flag) => (
        <CoachingTip key={flag} flag={flag} />
      ))}

      {/* PRIORITY 3: Drilling-known-letters (minor, gentle framing) */}
      {teachingKnownKids.length > 0 ? (
        <div className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          <Users
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
          <div>
            <p>
              <span className="font-semibold">
                {teachingKnownKids.length} of {total} children
              </span>{" "}
              already knew some letters at their baseline assessment:{" "}
              <span className="font-semibold">
                {formatNameList(teachingKnownKids)}
              </span>
              .
            </p>
            {unionLetters(teachingKnownKids, "teaching_known_letters", group.language).length >
            0 ? (
              <p className="mt-1">
                Letters they already knew:{" "}
                <span className="font-semibold">
                  {unionLetters(
                    teachingKnownKids,
                    "teaching_known_letters",
                  ).join(", ")}
                </span>
                . If you&apos;d like, you can move faster on these letters for
                these children.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
