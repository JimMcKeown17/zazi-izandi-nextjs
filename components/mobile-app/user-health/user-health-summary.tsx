import {
  Activity,
  AlertTriangle,
  DatabaseZap,
  LogIn,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import type { MobileUserHealthResponse } from "@/lib/mobile/user-health/types";

const TONES = {
  blue: "bg-primary-50 text-primary",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
  slate: "bg-slate-100 text-slate-600",
} as const;

export function UserHealthSummary({ data }: { data: MobileUserHealthResponse }) {
  const total = data.summary.total_users;
  const cards = [
    {
      label: "EA accounts",
      value: total,
      detail: `${data.summary.auth_ready} enabled, confirmed, and not blocked`,
      icon: ShieldCheck,
      tone: "blue" as const,
    },
    {
      label: "Authenticated after provisioning",
      value: `${data.summary.authenticated_after_provisioning} / ${data.summary.authentication_measurable}`,
      detail: "Successful Auth event after the credential-release cutoff; not app/device proof",
      icon: LogIn,
      tone: "green" as const,
    },
    {
      label: "Device signals",
      value: data.summary.registered_devices,
      detail: "Positive app-device evidence; not an install denominator",
      icon: Smartphone,
      tone: "violet" as const,
    },
    {
      label: `Active · ${data.days}d`,
      value: data.summary.active_in_window,
      detail: "Clock, session, or app-created assessment activity",
      icon: Activity,
      tone: "green" as const,
    },
    {
      label: "Seeded data ready",
      value: `${data.summary.seeded_data_ready}/${data.summary.seeded_expected}`,
      detail: "Expected classes, children, groups, and memberships present",
      icon: DatabaseZap,
      tone: "slate" as const,
    },
    {
      label: "Needs attention",
      value: data.summary.needs_attention,
      detail: "Auth block or missing expected seeded data",
      icon: AlertTriangle,
      tone: data.summary.needs_attention > 0 ? ("red" as const) : ("slate" as const),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                {card.label}
              </p>
              <span className={`rounded-lg p-2 ${TONES[card.tone]}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {card.value}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {card.detail}
            </p>
          </div>
        );
      })}
    </div>
  );
}
