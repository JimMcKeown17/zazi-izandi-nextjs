"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  Search,
  Smartphone,
} from "lucide-react";

import {
  getUserAttentionReasons,
  getUserHealthState,
  hasSeededDataReady,
  type UserAttentionReason,
  type UserHealthState,
} from "@/lib/mobile/user-health/presentation";
import type { MobileUserHealthRow } from "@/lib/mobile/user-health/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const ATTENTION_LABELS: Record<UserAttentionReason, string> = {
  auth_blocked: "Auth blocked",
  seeded_classes_missing: "Class missing",
  seeded_children_missing: "Children missing",
  seeded_groups_missing: "Groups missing",
  seeded_memberships_incomplete: "Group memberships incomplete",
};

const STATE_LABELS: Record<UserHealthState, string> = {
  active: "Active",
  onboarding: "Onboarding",
  not_started: "Not started",
  needs_attention: "Needs attention",
};

function formatTimestamp(value: string | null): string {
  return value ? DATE_TIME_FORMAT.format(new Date(value)) : "No evidence yet";
}

function HealthBadge({ user }: { user: MobileUserHealthRow }) {
  const state = getUserHealthState(user);
  const styles: Record<UserHealthState, string> = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    onboarding: "bg-blue-50 text-blue-700 ring-blue-200",
    not_started: "bg-slate-100 text-slate-600 ring-slate-200",
    needs_attention: "bg-red-50 text-red-700 ring-red-200",
  };
  const Icon =
    state === "active"
      ? CheckCircle2
      : state === "needs_attention"
        ? AlertTriangle
        : state === "onboarding"
          ? Clock3
          : CircleDashed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        styles[state]
      )}
    >
      <Icon className="h-3 w-3" /> {STATE_LABELS[state]}
    </span>
  );
}

function AuthEvidence({ user }: { user: MobileUserHealthRow }) {
  const labels = {
    ready: "Auth enabled",
    unconfirmed: "Email unconfirmed",
    banned: "Account banned",
    missing_email: "Email missing",
  } as const;
  return (
    <div>
      <p
        className={cn(
          "text-xs font-semibold",
          user.auth.state === "ready" ? "text-emerald-700" : "text-red-700"
        )}
      >
        {labels[user.auth.state]}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Last Auth event: {formatTimestamp(user.auth.last_sign_in_at)}
      </p>
      {user.auth.last_sign_in_at ? (
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          May be a provisioning check; not proof of an app login
        </p>
      ) : null}
    </div>
  );
}

function DeviceEvidence({ user }: { user: MobileUserHealthRow }) {
  if (!user.app_device.registered) {
    return (
      <div>
        <p className="text-xs font-semibold text-slate-500">No device signal</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Not proof that the app is absent
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-violet-700">
        <Smartphone className="h-3.5 w-3.5" /> {user.app_device.platform}
        {user.app_device.app_version ? ` · v${user.app_device.app_version}` : ""}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Seen {formatTimestamp(user.app_device.last_seen_at)}
      </p>
    </div>
  );
}

function DataEvidence({ user }: { user: MobileUserHealthRow }) {
  const ready = hasSeededDataReady(user);
  const expectationLabel =
    user.data.expectation === "seeded"
      ? ready
        ? "Seeded data ready"
        : "Seeded data gap"
      : user.data.expectation === "self_setup"
        ? "Self-setup cohort"
        : "Expectation unknown";
  return (
    <div>
      <p
        className={cn(
          "text-xs font-semibold",
          user.data.expectation === "seeded" && !ready
            ? "text-red-700"
            : ready
              ? "text-emerald-700"
              : "text-slate-600"
        )}
      >
        {expectationLabel}
      </p>
      <p className="mt-1 text-xs tabular-nums text-slate-500">
        {user.data.classes} class · {user.data.children} children ·{" "}
        {user.data.groups} groups · {user.data.grouped_children} grouped
      </p>
      {user.data.imported_assessments > 0 ? (
        <p className="mt-1 text-[11px] text-slate-400">
          {user.data.imported_assessments} imported assessments (not usage)
        </p>
      ) : null}
    </div>
  );
}

function ActivityEvidence({
  user,
  days,
}: {
  user: MobileUserHealthRow;
  days: number;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tabular-nums text-slate-700">
        {user.activity.clock_entries} clocks · {user.activity.sessions} sessions ·{" "}
        {user.activity.app_assessments} assessments
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        Last {days} days · app-created only
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Last activity: {formatTimestamp(user.activity.last_activity_at)}
      </p>
    </div>
  );
}

function AttentionReasons({ user }: { user: MobileUserHealthRow }) {
  const reasons = getUserAttentionReasons(user);
  if (reasons.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {reasons.map((reason) => (
        <span
          key={reason}
          className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
        >
          {ATTENTION_LABELS[reason]}
        </span>
      ))}
    </div>
  );
}

export function UserHealthBoard({
  users,
  days,
}: {
  users: MobileUserHealthRow[];
  days: number;
}) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<UserHealthState | "all">("all");
  const [expectationFilter, setExpectationFilter] = useState<
    MobileUserHealthRow["data"]["expectation"] | "all"
  >("all");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesQuery =
          deferredQuery.length === 0 ||
          user.display_name.toLowerCase().includes(deferredQuery) ||
          (user.email?.toLowerCase().includes(deferredQuery) ?? false) ||
          user.user_id.toLowerCase().includes(deferredQuery);
        const matchesState =
          stateFilter === "all" || getUserHealthState(user) === stateFilter;
        const matchesExpectation =
          expectationFilter === "all" ||
          user.data.expectation === expectationFilter;
        return matchesQuery && matchesState && matchesExpectation;
      }),
    [deferredQuery, expectationFilter, stateFilter, users]
  );

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visibleUsers = filteredUsers.slice(start, start + PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto] lg:items-end">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Find a youth
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Name, email, or UUID"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </span>
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Health state
          <select
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value as UserHealthState | "all");
              setPage(1);
            }}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary"
          >
            <option value="all">All states</option>
            <option value="needs_attention">Needs attention</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="not_started">Not started</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Data cohort
          <select
            value={expectationFilter}
            onChange={(event) => {
              setExpectationFilter(
                event.target.value as
                  | MobileUserHealthRow["data"]["expectation"]
                  | "all"
              );
              setPage(1);
            }}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary"
          >
            <option value="all">All cohorts</option>
            <option value="seeded">TeamPact seeded</option>
            <option value="self_setup">Self-setup</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <p className="pb-2 text-xs font-medium tabular-nums text-slate-500">
          {filteredUsers.length.toLocaleString("en-ZA")} of{" "}
          {users.length.toLocaleString("en-ZA")} users
        </p>
      </div>

      {visibleUsers.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="font-semibold text-slate-800">No users match these filters</p>
          <p className="mt-1 text-sm text-slate-500">
            Clear the search or choose a broader health/data state.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[1260px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
                  <th className="px-4 py-3">Youth identity</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Auth evidence</th>
                  <th className="px-4 py-3">Device signal</th>
                  <th className="px-4 py-3">Server data</th>
                  <th className="px-4 py-3">App activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((user) => (
                  <tr key={user.user_id} className="align-top hover:bg-slate-50/80">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">{user.display_name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {user.email ?? "No email"}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">
                        {user.user_id}
                      </p>
                      <p className="mt-1 max-w-56 text-xs text-slate-500">
                        {user.current_school} · current school
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <HealthBadge user={user} />
                      <AttentionReasons user={user} />
                    </td>
                    <td className="px-4 py-4"><AuthEvidence user={user} /></td>
                    <td className="px-4 py-4"><DeviceEvidence user={user} /></td>
                    <td className="px-4 py-4"><DataEvidence user={user} /></td>
                    <td className="px-4 py-4">
                      <ActivityEvidence user={user} days={days} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 xl:hidden">
            {visibleUsers.map((user) => (
              <article key={user.user_id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">{user.display_name}</h3>
                    <p className="mt-1 break-all text-xs text-slate-600">
                      {user.email ?? "No email"}
                    </p>
                    <p className="mt-1 break-all font-mono text-[10px] text-slate-400">
                      {user.user_id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {user.current_school} · current school
                    </p>
                  </div>
                  <div>
                    <HealthBadge user={user} />
                    <AttentionReasons user={user} />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Auth evidence
                    </p>
                    <AuthEvidence user={user} />
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Device signal
                    </p>
                    <DeviceEvidence user={user} />
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Server data
                    </p>
                    <DataEvidence user={user} />
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      App activity
                    </p>
                    <ActivityEvidence user={user} days={days} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <span className="text-xs font-medium text-slate-500">
            Page {safePage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={safePage === pageCount}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
