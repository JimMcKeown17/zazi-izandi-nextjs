import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { EaGroupDetail } from "@/lib/ea/types";
import { StatusBadge } from "./status-badge";

function formatGroupName(raw: string, eaName?: string): string {
  if (!eaName) return raw;
  const prefix = `${eaName}-`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
}

interface GroupDetailHeaderProps {
  group: EaGroupDetail;
  backHref: string;
  backLabel?: string;
  eaName?: string;
}

export function GroupDetailHeader({
  group,
  backHref,
  backLabel = "Back",
  eaName,
}: GroupDetailHeaderProps) {
  const displayName = formatGroupName(group.group_name, eaName);
  const childrenCount = group.children_count;

  return (
    <header className="space-y-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-900 break-words">
            {displayName}
          </h1>
          <p className="text-xs text-slate-500">
            {group.grade} · {group.school_name}
          </p>
        </div>
        <StatusBadge flags={group.flags} />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span>
          <span className="font-semibold text-slate-900">
            {group.sessions_this_week}
          </span>{" "}
          sessions this week
        </span>
        <span>
          <span className="font-semibold text-slate-900">{childrenCount}</span>{" "}
          {childrenCount === 1 ? "child" : "children"}
        </span>
        <span>
          <span className="font-semibold text-slate-900">
            {group.total_sessions}
          </span>{" "}
          total
        </span>
      </div>
    </header>
  );
}
