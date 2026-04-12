import { BookOpen, Layers } from "lucide-react";
import type { EaGroup } from "@/lib/ea/types";
import { CoachingTip, getTopFlag } from "./coaching-tip";

function formatGroupName(raw: string, eaName?: string): string {
  if (!eaName) return raw;
  const prefix = `${eaName}-`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
}

function StatusBadge({ flags }: { flags: string[] }) {
  if (flags.includes("ghost_group")) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 shrink-0 whitespace-nowrap">
        Low dosage
      </span>
    );
  }
  if (
    flags.includes("moving_too_fast") ||
    flags.includes("stagnation") ||
    flags.includes("curriculum_gaps")
  ) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 shrink-0 whitespace-nowrap">
        Needs attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 shrink-0 whitespace-nowrap">
      On track
    </span>
  );
}

function LetterProgressBar({
  progressPct,
  currentLetter,
}: {
  progressPct: number;
  currentLetter: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>Letter progress</span>
        <span className="font-medium text-slate-700">
          {Math.round(progressPct)}% · letter {currentLetter}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(progressPct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function BlendingSessionBar({
  totalSessions,
}: {
  totalSessions: number;
}) {
  const cap = 50;
  const pct = Math.min((totalSessions / cap) * 100, 100);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3" />
          Blending
        </span>
        <span className="font-medium text-slate-700">
          {totalSessions}/{cap} sessions
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface GroupCardProps {
  group: EaGroup;
  showSchoolName?: boolean;
  eaName?: string;
}

export function GroupCard({ group, showSchoolName = false, eaName }: GroupCardProps) {
  const topFlag = getTopFlag(group.flags);
  const displayName = formatGroupName(group.group_name, eaName);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900">
            {displayName}
          </h2>
          <p className="text-xs text-slate-500">
            {group.grade}
            {showSchoolName ? ` · ${group.school_name}` : ""}
          </p>
        </div>
        <StatusBadge flags={group.flags} />
      </div>

      {group.phase === "letters" ? (
        <LetterProgressBar
          progressPct={group.progress_pct}
          currentLetter={group.current_letter}
        />
      ) : (
        <BlendingSessionBar totalSessions={group.total_sessions} />
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {group.sessions_this_week} this week
        </span>
        <span>{group.total_sessions} total</span>
        <span>{group.children_count} kids</span>
      </div>

      {topFlag ? <CoachingTip flag={topFlag} /> : null}
    </article>
  );
}
