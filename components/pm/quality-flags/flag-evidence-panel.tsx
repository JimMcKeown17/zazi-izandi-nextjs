"use client";

import { X, Loader2 } from "lucide-react";
import type { FlagEvidenceResponse, GroupSummary } from "@/lib/pm/types";
import { LETTER_SEQUENCES, DEFAULT_LANGUAGE } from "@/lib/pm/constants";

type FlagKey = keyof GroupSummary["flags"];

interface Props {
  flagType: FlagKey;
  group: GroupSummary;
  allGroups: GroupSummary[];
  evidence: FlagEvidenceResponse | null;
  loading: boolean;
  onClose: () => void;
}

export function FlagEvidencePanel({
  flagType,
  group,
  allGroups,
  evidence,
  loading,
  onClose,
}: Props) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto animate-slideInRight">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {FLAG_LABELS[flagType]}
            </p>
            <p className="text-xs text-slate-500">
              {group.program_name} — {group.class_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading evidence...
            </div>
          ) : (
            <EvidenceContent
              flagType={flagType}
              group={group}
              allGroups={allGroups}
              evidence={evidence}
            />
          )}
        </div>
      </div>
    </>
  );
}

const FLAG_LABELS: Record<FlagKey, string> = {
  same_letter_group: "Same Letter Groups",
  moving_too_fast: "Moving Too Fast",
  ghost_group: "Ghost Group",
  stagnation: "Stagnation",
  curriculum_gaps: "Not Following Letter Order",
  teaching_known: "Teaching Known Letters",
  skipping_needed: "Skipping Needed Letters",
};

function EvidenceContent({
  flagType,
  group,
  allGroups,
  evidence,
}: {
  flagType: FlagKey;
  group: GroupSummary;
  allGroups: GroupSummary[];
  evidence: FlagEvidenceResponse | null;
}) {
  switch (flagType) {
    case "moving_too_fast":
      return <MovingTooFastEvidence evidence={evidence} />;
    case "curriculum_gaps":
      return <CurriculumGapsEvidence evidence={evidence} />;
    case "stagnation":
      return <StagnationEvidence evidence={evidence} />;
    case "ghost_group":
      return <GhostGroupEvidence group={group} />;
    case "same_letter_group":
      return <SameLetterEvidence group={group} allGroups={allGroups} />;
    default:
      return <p className="text-sm text-slate-400">No evidence available for this flag type.</p>;
  }
}

// ─── Moving Too Fast ──────────────────────────────────────────

function MovingTooFastEvidence({ evidence }: { evidence: FlagEvidenceResponse | null }) {
  if (!evidence) return <NoData />;

  const { transitions, transition_summary, sessions } = evidence;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <p className="text-sm font-medium text-orange-800">
          {transition_summary.no_review} of {transition_summary.total} transitions ({transition_summary.pct_no_review}%) had no letter overlap
        </p>
        <p className="text-xs text-orange-600 mt-1">
          Threshold: flagged when &gt;70% of transitions skip review
        </p>
      </div>

      {/* Session timeline */}
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">Session Timeline</p>
        <div className="space-y-0">
          {sessions.map((s, i) => (
            <div key={s.session_id}>
              {/* Session row */}
              <div className="flex items-center gap-2 py-1.5">
                <span className="text-[10px] text-slate-400 w-16 shrink-0">
                  {new Date(s.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                </span>
                <div className="flex flex-wrap gap-0.5">
                  {s.letters_taught.map((l) => (
                    <span
                      key={l}
                      className="text-[10px] font-mono w-5 h-5 flex items-center justify-center rounded bg-blue-100 text-blue-700 font-medium"
                    >
                      {l}
                    </span>
                  ))}
                  {s.letters_taught.length === 0 && (
                    <span className="text-[10px] text-slate-400 italic">no letters</span>
                  )}
                </div>
              </div>
              {/* Transition indicator */}
              {i < transitions.length && (
                <div className="flex items-center gap-2 py-0.5 pl-16">
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      transitions[i].overlap
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {transitions[i].overlap ? "review" : "no review"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Curriculum Gaps ──────────────────────────────────────────

function CurriculumGapsEvidence({ evidence }: { evidence: FlagEvidenceResponse | null }) {
  if (!evidence) return <NoData />;

  const { gaps, all_letters_taught } = evidence;
  const taughtSet = new Set(all_letters_taught);
  const gapSet = new Set(gaps);

  // Use language-specific sequence from API response
  const seq = evidence.letter_sequence || LETTER_SEQUENCES[DEFAULT_LANGUAGE];
  const taughtIndices = all_letters_taught
    .map((l) => seq.indexOf(l))
    .filter((i) => i >= 0);
  const maxTaught = taughtIndices.length > 0 ? Math.max(...taughtIndices) : -1;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-800">
          {gaps.length} letter{gaps.length !== 1 ? "s" : ""} skipped in the prescribed sequence
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Skipped: {gaps.map((l) => l.toUpperCase()).join(", ")}
        </p>
      </div>

      {/* Letter sequence grid */}
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">Letter Sequence</p>
        <div className="flex flex-wrap gap-1">
          {seq.map((letter, i) => {
            const isTaught = taughtSet.has(letter);
            const isGap = gapSet.has(letter);
            const isNotReached = i > maxTaught;

            let classes = "w-8 h-8 flex items-center justify-center rounded text-xs font-mono font-medium ";
            if (isGap) {
              classes += "bg-red-100 text-red-700 ring-2 ring-red-400";
            } else if (isTaught) {
              classes += "bg-blue-100 text-blue-700";
            } else if (isNotReached) {
              classes += "bg-slate-50 text-slate-300";
            } else {
              classes += "bg-slate-100 text-slate-400";
            }

            return (
              <div key={letter} className="flex flex-col items-center gap-0.5">
                <span className={classes}>{letter.toUpperCase()}</span>
                <span className="text-[8px] text-slate-400">{i + 1}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-100 inline-block" /> Taught
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-100 ring-1 ring-red-400 inline-block" /> Skipped
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-50 inline-block" /> Not reached
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Stagnation ───────────────────────────────────────────────

function StagnationEvidence({ evidence }: { evidence: FlagEvidenceResponse | null }) {
  if (!evidence) return <NoData />;

  const { stagnation } = evidence;
  const { recent_weeks, prior_weeks } = stagnation;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm font-medium text-amber-800">
          No letter progression in 4+ weeks despite active sessions
        </p>
        <p className="text-xs text-amber-600 mt-1">
          The furthest letter taught has not changed between the two periods
        </p>
      </div>

      {/* Two-period comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Prior 2 Weeks</p>
          <p className="text-lg font-bold text-slate-800">
            {prior_weeks.max_letter ? prior_weeks.max_letter.toUpperCase() : "—"}
          </p>
          <p className="text-xs text-slate-500">
            Position {prior_weeks.max_progress_index + 1} of {evidence.letter_sequence?.length ?? 26}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {prior_weeks.sessions} session{prior_weeks.sessions !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Recent 2 Weeks</p>
          <p className="text-lg font-bold text-slate-800">
            {recent_weeks.max_letter ? recent_weeks.max_letter.toUpperCase() : "—"}
          </p>
          <p className="text-xs text-slate-500">
            Position {recent_weeks.max_progress_index + 1} of {evidence.letter_sequence?.length ?? 26}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {recent_weeks.sessions} session{recent_weeks.sessions !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {stagnation.is_stagnant && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
          Both periods show the same max letter ({recent_weeks.max_letter?.toUpperCase()}) with {recent_weeks.sessions + prior_weeks.sessions} total sessions. The EA is running sessions but not advancing the curriculum.
        </p>
      )}
    </div>
  );
}

// ─── Ghost Group (client-side only) ───────────────────────────

function GhostGroupEvidence({ group }: { group: GroupSummary }) {
  const lastDate = group.last_session_date;

  let daysSince = 0;
  if (lastDate) {
    const last = new Date(lastDate);
    const now = new Date();
    daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p className="text-sm font-medium text-purple-800">
          No sessions in {daysSince} days
        </p>
        <p className="text-xs text-purple-600 mt-1">
          Threshold: flagged after 5+ weekdays without a session
        </p>
      </div>

      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Last Session</p>
        <p className="text-lg font-bold text-slate-800">
          {lastDate
            ? new Date(lastDate).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Never"}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {daysSince} calendar days ago ({group.total_sessions} total sessions)
        </p>
      </div>
    </div>
  );
}

// ─── Same Letter Groups (client-side only) ────────────────────

function SameLetterEvidence({
  group,
  allGroups,
}: {
  group: GroupSummary;
  allGroups: GroupSummary[];
}) {
  // Find all letter-phase groups for this EA
  const eaGroups = allGroups.filter(
    (g) => g.ea_name === group.ea_name && g.phase === "letters"
  );

  // Find which progress indices have 3+ groups
  const indexCounts = new Map<number, number>();
  for (const g of eaGroups) {
    if (g.progress_index >= 0) {
      indexCounts.set(g.progress_index, (indexCounts.get(g.progress_index) || 0) + 1);
    }
  }
  const flaggedIndices = new Set(
    Array.from(indexCounts.entries())
      .filter(([, count]) => count >= 3)
      .map(([idx]) => idx)
  );

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-sm font-medium text-red-800">
          EA &quot;{group.ea_name}&quot; has {flaggedIndices.size} letter position{flaggedIndices.size !== 1 ? "s" : ""} with 3+ groups
        </p>
        <p className="text-xs text-red-600 mt-1">
          This usually means the EA is not differentiating instruction between groups
        </p>
      </div>

      {/* EA's groups table */}
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">
          All groups for {group.ea_name} ({eaGroups.length} letter-phase groups)
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-100">
              <th className="text-left py-1.5">Group</th>
              <th className="text-center py-1.5">Letter</th>
              <th className="text-center py-1.5">Position</th>
              <th className="text-right py-1.5">Sess/Wk</th>
            </tr>
          </thead>
          <tbody>
            {eaGroups.map((g) => {
              const isFlagged = flaggedIndices.has(g.progress_index);
              return (
                <tr
                  key={`${g.program_name}-${g.class_name}`}
                  className={`border-t border-slate-50 ${isFlagged ? "bg-red-50" : ""}`}
                >
                  <td className="py-1.5 text-slate-800">{g.class_name}</td>
                  <td className="py-1.5 text-center font-mono font-medium">
                    {g.current_letter ? g.current_letter.toUpperCase() : "—"}
                  </td>
                  <td className="py-1.5 text-center">
                    <span className={isFlagged ? "font-bold text-red-600" : "text-slate-600"}>
                      {g.progress_index >= 0 ? g.progress_index + 1 : "—"}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-slate-600">
                    {g.avg_sessions_per_week.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NoData() {
  return (
    <p className="text-sm text-slate-400 text-center py-8">
      Unable to load evidence data. The API may be unavailable.
    </p>
  );
}
