import Link from "next/link";
import { BookOpen, Layers } from "lucide-react";
import type { EaGroup } from "@/lib/ea/types";
import { CoachingTip, getTopFlag } from "@/components/group-detail/coaching-tip";
import { StatusBadge } from "@/components/group-detail/status-badge";

function formatGroupName(raw: string, eaName?: string): string {
  if (!eaName) return raw;
  const prefix = `${eaName}-`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
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

  const cardBody = (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300">
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

  if (group.class_id === null) {
    return cardBody;
  }

  return (
    <Link
      href={`/my-kids/groups/${group.class_id}`}
      className="block focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl"
    >
      {cardBody}
    </Link>
  );
}
