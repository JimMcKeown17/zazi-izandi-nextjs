import { Activity, AlertTriangle, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";

import {
  buildUserHealthOverviewMetrics,
  formatActiveCardLabel,
} from "@/lib/mobile/user-health/overview";
import type {
  MobileUserDataExpectation,
  MobileUserHealthRow,
} from "@/lib/mobile/user-health/types";
import type { WaveSelection } from "@/lib/mobile/user-health/wave";

const TONES = {
  blue: "bg-primary-50 text-primary",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-600",
} as const;

export function UserHealthSummary({
  users,
  days,
  schoolId,
  cohort,
  wave,
}: {
  users: MobileUserHealthRow[];
  days: number;
  schoolId: string | null;
  cohort: MobileUserDataExpectation | "all";
  wave: WaveSelection;
}) {
  const metrics = buildUserHealthOverviewMetrics(users);
  const buildHref = (state?: "active" | "activated" | "has_blockers") => {
    const params = new URLSearchParams({ days: String(days) });
    if (schoolId) params.set("school_id", schoolId);
    if (cohort !== "all") params.set("cohort", cohort);
    if (wave !== "all") params.set("wave", wave);
    if (state) params.set("state", state);
    return `/mobile-app/user-health?${params.toString()}`;
  };
  const cards = [
    {
      label: "EA accounts",
      value: metrics.accounts,
      detail: "Eligible, provisioned accounts in the selected population",
      icon: ShieldCheck,
      tone: "blue" as const,
      href: buildHref(),
    },
    {
      label: "Activated ever",
      value: metrics.activatedEver,
      detail: "Has ever clocked, run a session, or created an assessment",
      icon: Rocket,
      tone: "green" as const,
      href: buildHref("activated"),
    },
    {
      label: formatActiveCardLabel(days),
      value: metrics.activeInWindow,
      detail:
        days === 1
          ? "Did real work in the app today (SAST)"
          : "Did real work in the app during the selected window",
      icon: Activity,
      tone: "green" as const,
      href: buildHref("active"),
    },
    {
      label: "Needs attention",
      value: metrics.needsAttention,
      detail: `${metrics.attentionAccess} access · ${metrics.attentionSetup} seeded setup`,
      icon: AlertTriangle,
      tone: metrics.needsAttention > 0 ? ("red" as const) : ("slate" as const),
      href: buildHref("has_blockers"),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Filter ↓
                </p>
              </div>
              <span className={`rounded-lg p-2 ${TONES[card.tone]}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {card.value}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {card.detail}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
