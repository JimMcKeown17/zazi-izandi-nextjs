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

function alignmentBarClasses(score: number | null): {
  fill: string;
  label: string;
} {
  if (score === null) {
    return { fill: "bg-slate-300", label: "text-slate-500" };
  }
  if (score >= 70) return { fill: "bg-emerald-500", label: "text-emerald-700" };
  if (score >= 50) return { fill: "bg-amber-500", label: "text-amber-700" };
  return { fill: "bg-red-500", label: "text-red-700" };
}

function AlignmentBar({ score }: { score: number | null }) {
  const { fill, label } = alignmentBarClasses(score);
  const width = score === null ? 0 : Math.max(0, Math.min(score, 100));
  const display =
    score === null ? "not yet scored" : `${Math.round(score)}%`;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>Alignment score</span>
        <span className={`font-medium ${label}`}>{display}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full transition-all ${fill}`}
          style={{ width: `${width}%` }}
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
  /**
   * Optional href builder. Defaults to `/my-kids/groups/${class_id}`.
   * Pass a custom builder when rendering GroupCard in a non-EA context
   * (e.g. PM EA Mobile View preview) to redirect clicks to a different route.
   */
  groupHref?: (group: EaGroup) => string;
}

export function GroupCard({ group, showSchoolName = false, eaName, groupHref }: GroupCardProps) {
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
        <AlignmentBar score={group.avg_alignment_score} />
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

  const href = groupHref
    ? groupHref(group)
    : `/my-kids/groups/${group.class_id}`;

  return (
    <Link
      href={href}
      className="block focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl"
    >
      {cardBody}
    </Link>
  );
}
