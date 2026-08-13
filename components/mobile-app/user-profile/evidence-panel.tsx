import { Database, KeyRound, Smartphone } from "lucide-react";

import { toHealthRowShape } from "@/lib/mobile/user-profile/presentation";
import type { MobileUserProfileResponse } from "@/lib/mobile/user-profile/types";
import { getProvisioningAuthenticationPresentation } from "@/lib/mobile/user-health/presentation";
import { cn } from "@/lib/utils";

const DATE_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const AUTH_STATE_LABELS = {
  ready: "Auth enabled",
  unconfirmed: "Email unconfirmed",
  banned: "Account banned",
  missing_email: "Email missing",
} as const;

function formatDate(value: string | null): string {
  return value ? DATE_FORMAT.format(new Date(value)) : "No evidence yet";
}

function formatTimestamp(value: string | null): string {
  return value ? DATE_TIME_FORMAT.format(new Date(value)) : "No evidence yet";
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function EvidencePanel({
  profile,
}: {
  profile: MobileUserProfileResponse;
}) {
  const user = toHealthRowShape(profile);
  const authentication = getProvisioningAuthenticationPresentation(user);
  const authenticationTone = {
    proven: "text-emerald-700",
    not_proven: "text-amber-700",
    unmeasured: "text-slate-500",
  } as const;
  const currentDevice = profile.app_device.registered
    ? `${titleCase(profile.app_device.platform ?? "unknown")}${
        profile.app_device.app_version
          ? ` · v${profile.app_device.app_version}`
          : ""
      }`
    : "No current signal";

  return (
    <section
      aria-labelledby="profile-evidence-title"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 id="profile-evidence-title" className="font-bold text-slate-900">
          Onboarding and evidence
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Signals show what the systems recorded. Absence of a signal is not
          proof that an action never happened.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg bg-slate-50 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <KeyRound className="h-4 w-4" /> Auth / login
          </h3>
          <p className="mt-3 text-sm font-semibold text-slate-800">
            {AUTH_STATE_LABELS[profile.auth.state]}
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              authenticationTone[authentication.tone]
            )}
          >
            {authentication.label}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Last Auth event: {formatTimestamp(profile.auth.last_sign_in_at)}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {authentication.detail}
          </p>
        </article>

        <article className="rounded-lg bg-slate-50 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Smartphone className="h-4 w-4" /> Device / app open
          </h3>
          <p className="mt-3 text-sm font-semibold text-slate-800">
            Current device: {currentDevice}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ever registered: {profile.ever_registered_device ? "Yes" : "No"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Current device seen: {formatTimestamp(profile.app_device.last_seen_at)}
          </p>
          <p className="mt-2 text-xs font-semibold text-blue-700">
            Opened first: {formatDate(profile.lifetime.first_app_open_at)}
          </p>
          <p className="mt-1 text-xs font-semibold text-blue-700">
            Opened last: {formatDate(profile.lifetime.last_app_open_at)}
          </p>
        </article>

        <article className="rounded-lg bg-slate-50 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Database className="h-4 w-4" /> Server data
          </h3>
          <p className="mt-3 text-sm font-semibold text-slate-800">
            {profile.data.classes}{" "}
            {profile.data.classes === 1 ? "class" : "classes"} ·{" "}
            {profile.data.children} children ·{" "}
            {profile.data.groups} groups
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {profile.data.grouped_children} of {profile.data.children} children
            grouped
          </p>
          <p className="mt-2 text-sm font-semibold text-violet-700">
            {profile.data.children_assessed} of {profile.data.children} children
            have assessment info
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {profile.data.imported_assessments} imported assessment records
          </p>
        </article>
      </div>
    </section>
  );
}
