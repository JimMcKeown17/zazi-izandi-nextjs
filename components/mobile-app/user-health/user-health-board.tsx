"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardCopy,
  Clock3,
  Download,
  Search,
  Smartphone,
} from "lucide-react";

import { UserHealthWaveFunnel } from "@/components/mobile-app/user-health/user-health-wave-funnel";
import { getEmploymentStatusDisplay } from "@/lib/mobile/presentation";
import {
  buildChaseListCsv,
  buildChaseListText,
  type ChaseListContext,
  type ChaseListOptions,
} from "@/lib/mobile/user-health/export";
import { buildFunnelCounts } from "@/lib/mobile/user-health/funnel";
import {
  ATTENTION_LABELS,
  BLOCKER_PLAYBOOK,
  getActivityStage,
  getProvisioningAuthenticationPresentation,
  getUserAttentionReasons,
  hasRecentAppActivity,
  hasSeededDataReady,
  isQuiet,
  selectBoardRows,
  type ActivityStage,
  type UserHealthPredicate,
  type UserHealthSortKey,
} from "@/lib/mobile/user-health/presentation";
import type {
  MobileRolloutWave,
  MobileUserHealthRow,
} from "@/lib/mobile/user-health/types";
import {
  filterRowsByWave,
  findWaveOption,
  type WaveSelection,
} from "@/lib/mobile/user-health/wave";
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
const DATE_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareWaveOptions(
  left: MobileRolloutWave,
  right: MobileRolloutWave
): number {
  return (
    compareStrings(left.launch_date, right.launch_date) ||
    compareStrings(left.name.toLowerCase(), right.name.toLowerCase()) ||
    compareStrings(left.id, right.id)
  );
}

const STAGE_STYLES: Record<ActivityStage, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reached: "bg-blue-50 text-blue-700 ring-blue-200",
  not_started: "bg-slate-100 text-slate-600 ring-slate-200",
};

function syncUrl(next: {
  q: string;
  predicate: UserHealthPredicate;
  cohort: MobileUserHealthRow["data"]["expectation"] | "all";
  wave: WaveSelection;
}) {
  const url = new URL(window.location.href);
  const setOrDelete = (key: string, value: string, empty: string) => {
    if (value === empty) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  };
  setOrDelete("q", next.q, "");
  setOrDelete("state", next.predicate, "all");
  setOrDelete("cohort", next.cohort, "all");
  setOrDelete("wave", next.wave, "all");
  window.history.replaceState(null, "", url.toString());
}

function formatTimestamp(value: string | null): string {
  return value ? DATE_TIME_FORMAT.format(new Date(value)) : "No evidence yet";
}

function formatDate(value: string): string {
  return DATE_FORMAT.format(new Date(value));
}

function buildClockLedgerHref(
  days: number,
  schoolId: string | null,
  userId: string
): string {
  const params = new URLSearchParams({ days: String(days) });
  if (schoolId !== null) params.set("school_id", schoolId);
  params.set("q", userId);
  return `/mobile-app/attendance?${params.toString()}`;
}

function StageBadge({
  user,
  days,
  lifetimeEvidence,
}: {
  user: MobileUserHealthRow;
  days: number;
  lifetimeEvidence: boolean;
}) {
  const stage = getActivityStage(user);
  const Icon =
    stage === "active"
      ? CheckCircle2
      : stage === "reached"
        ? Clock3
        : CircleDashed;
  const label =
    stage === "active"
      ? lifetimeEvidence
        ? "Activated"
        : `Active · ${days}d`
      : stage === "reached"
        ? lifetimeEvidence
          ? "Reached"
          : "Onboarding"
        : "Not started";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        STAGE_STYLES[stage]
      )}
    >
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function StageEvidence({
  user,
  days,
  lifetimeEvidence,
}: {
  user: MobileUserHealthRow;
  days: number;
  lifetimeEvidence: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StageBadge
        user={user}
        days={days}
        lifetimeEvidence={lifetimeEvidence}
      />
      {lifetimeEvidence && hasRecentAppActivity(user) ? (
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Active · {days}d
        </span>
      ) : null}
      {lifetimeEvidence && isQuiet(user) ? (
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
          Quiet · {days}d
        </span>
      ) : null}
    </div>
  );
}

function EmploymentBadge({ status }: { status: string | null }) {
  const display = getEmploymentStatusDisplay(status);
  if (!display || display.kind === "active") return null;
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {display.label}
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
  const authentication = getProvisioningAuthenticationPresentation(user);
  const authenticationTone = {
    proven: "text-emerald-700",
    not_proven: "text-amber-700",
    unmeasured: "text-slate-500",
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
      <p className={cn("mt-1 text-xs font-semibold", authenticationTone[authentication.tone])}>
        {authentication.label}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Last Auth event: {formatTimestamp(user.auth.last_sign_in_at)}
      </p>
      {user.auth.provisioning_cutoff_at ? (
        <p className="mt-1 text-[11px] text-slate-400">
          Cutoff: {formatTimestamp(user.auth.provisioning_cutoff_at)} SAST
        </p>
      ) : null}
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
        {authentication.detail}
      </p>
    </div>
  );
}

function DeviceEvidence({
  user,
  lifetimeEvidence,
}: {
  user: MobileUserHealthRow;
  lifetimeEvidence: boolean;
}) {
  return (
    <div>
      {!user.app_device.registered ? (
        <>
          <p className="text-xs font-semibold text-slate-500">
            No device signal
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Not proof that the app is absent
          </p>
        </>
      ) : (
        <>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-violet-700">
            <Smartphone className="h-3.5 w-3.5" /> {user.app_device.platform}
            {user.app_device.app_version
              ? ` · v${user.app_device.app_version}`
              : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Seen {formatTimestamp(user.app_device.last_seen_at)}
          </p>
        </>
      )}
      {lifetimeEvidence && user.last_app_open_at ? (
        <p className="mt-2 text-xs font-semibold text-blue-700">
          Opened {formatDate(user.last_app_open_at)}
        </p>
      ) : null}
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
  schoolId,
}: {
  user: MobileUserHealthRow;
  days: number;
  schoolId: string | null;
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
      {user.activity.clock_entries > 0 ? (
        <Link
          href={buildClockLedgerHref(days, schoolId, user.user_id)}
          className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
        >
          View clock ledger →
        </Link>
      ) : null}
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
          title={BLOCKER_PLAYBOOK[reason]}
          className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
        >
          {ATTENTION_LABELS[reason]}
        </span>
      ))}
    </div>
  );
}

type ChaseListCopyState = "idle" | "copying" | "copied" | "failed";

export async function copyChaseListToClipboard(
  rows: MobileUserHealthRow[],
  context: ChaseListContext,
  options: ChaseListOptions = { partB: true }
): Promise<Extract<ChaseListCopyState, "copied" | "failed">> {
  try {
    await navigator.clipboard.writeText(
      buildChaseListText(rows, context, options)
    );
    return "copied";
  } catch {
    return "failed";
  }
}

function getSchoolSlug(schoolName: string | null): string {
  if (schoolName === null) return "all-schools";
  return (
    schoolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "school"
  );
}

export function UserHealthBoard({
  users,
  days,
  generatedAt,
  schoolId,
  schoolName,
  initialQuery = "",
  initialPredicate = "all",
  initialCohort = "all",
  waveOptions = [],
  initialWave = "all",
  lifetimeEvidence = true,
}: {
  users: MobileUserHealthRow[];
  days: number;
  generatedAt: string;
  schoolId: string | null;
  schoolName: string | null;
  initialQuery?: string;
  initialPredicate?: UserHealthPredicate;
  initialCohort?: MobileUserHealthRow["data"]["expectation"] | "all";
  waveOptions?: MobileRolloutWave[];
  initialWave?: WaveSelection;
  lifetimeEvidence?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [predicate, setPredicate] =
    useState<UserHealthPredicate>(initialPredicate);
  const [expectationFilter, setExpectationFilter] = useState<
    MobileUserHealthRow["data"]["expectation"] | "all"
  >(initialCohort);
  const [sortKey, setSortKey] = useState<UserHealthSortKey>("urgency");
  const [wave, setWave] = useState<WaveSelection>(initialWave);
  const [page, setPage] = useState(1);
  const [copyState, setCopyState] = useState<ChaseListCopyState>("idle");

  const sortedWaveOptions = useMemo(
    () => [...waveOptions].sort(compareWaveOptions),
    [waveOptions]
  );
  const effectiveWave = lifetimeEvidence ? wave : "all";
  const selectedWave = findWaveOption(sortedWaveOptions, effectiveWave);
  const waveRows = useMemo(
    () => filterRowsByWave(users, effectiveWave),
    [effectiveWave, users]
  );
  const rows = useMemo(
    () =>
      selectBoardRows(waveRows, {
        query,
        predicate,
        cohort: expectationFilter,
        sortKey,
      }),
    [expectationFilter, predicate, query, sortKey, waveRows]
  );
  const funnelCounts = useMemo(() => buildFunnelCounts(waveRows), [waveRows]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visibleUsers = rows.slice(start, start + PAGE_SIZE);
  const context: ChaseListContext = {
    days,
    generatedAt,
    schoolId,
    schoolName,
    wave: effectiveWave === "none" ? "none" : (selectedWave ?? undefined),
  };

  const handleDownload = () => {
    const blob = new Blob(
      [buildChaseListCsv(rows, context, { partB: lifetimeEvidence })],
      {
        type: "text/csv",
      }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `user-health-chase-list-${days}d-${getSchoolSlug(schoolName)}-${generatedAt.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    setCopyState("copying");
    const result = await copyChaseListToClipboard(rows, context, {
      partB: lifetimeEvidence,
    });
    setCopyState(result);
    if (result === "copied") {
      window.setTimeout(() => setCopyState("idle"), 2_000);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {!lifetimeEvidence ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Lifetime rollout evidence is temporarily unavailable — showing the
          window-scoped view.
        </div>
      ) : null}
      <div
        className={cn(
          "grid gap-3 border-b border-slate-200 p-4 lg:items-end",
          lifetimeEvidence
            ? "lg:grid-cols-[minmax(14rem,1fr)_10.5rem_10.5rem_10.5rem_10rem_minmax(13rem,auto)]"
            : "lg:grid-cols-[minmax(14rem,1fr)_10.5rem_10.5rem_10rem_minmax(13rem,auto)]"
        )}
      >
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Find an EA
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                setPage(1);
                syncUrl({
                  q: nextQuery,
                  predicate,
                  cohort: expectationFilter,
                  wave: effectiveWave,
                });
              }}
              placeholder="Name, email, or UUID"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </span>
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Stage / blockers
          <select
            value={predicate}
            onChange={(event) => {
              const nextPredicate = event.target.value as UserHealthPredicate;
              setPredicate(nextPredicate);
              setPage(1);
              syncUrl({
                q: query,
                predicate: nextPredicate,
                cohort: expectationFilter,
                wave: effectiveWave,
              });
            }}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary"
          >
            <option value="all">All EAs</option>
            <option value="has_blockers">Has blockers</option>
            <option value="active">Active · in window</option>
            {lifetimeEvidence ? (
              <option value="activated">Activated (ever)</option>
            ) : null}
            {lifetimeEvidence ? (
              <option value="quiet">
                Quiet (activated, silent in window)
              </option>
            ) : null}
            <option value="reached">
              {lifetimeEvidence ? "Reached" : "Onboarding"}
            </option>
            <option value="not_started">Not started</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Data cohort
          <select
            value={expectationFilter}
            onChange={(event) => {
              const nextCohort = event.target.value as
                | MobileUserHealthRow["data"]["expectation"]
                | "all";
              setExpectationFilter(nextCohort);
              setPage(1);
              syncUrl({
                q: query,
                predicate,
                cohort: nextCohort,
                wave: effectiveWave,
              });
            }}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary"
          >
            <option value="all">All cohorts</option>
            <option value="seeded">TeamPact seeded</option>
            <option value="self_setup">Self-setup</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        {lifetimeEvidence ? (
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rollout wave
            <select
              value={wave}
              onChange={(event) => {
                const nextWave = event.target.value as WaveSelection;
                setWave(nextWave);
                setPage(1);
                syncUrl({
                  q: query,
                  predicate,
                  cohort: expectationFilter,
                  wave: nextWave,
                });
              }}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary"
            >
              <option value="all">All waves</option>
              <option value="none">No wave</option>
              {sortedWaveOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sort by
          <select
            value={sortKey}
            onChange={(event) => {
              setSortKey(event.target.value as UserHealthSortKey);
              setPage(1);
            }}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary"
          >
            <option value="urgency">Most urgent</option>
            <option value="last_activity">Last activity</option>
            <option value="name">Name</option>
            <option value="school">School</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <p className="w-full text-xs font-medium tabular-nums text-slate-500 lg:text-right">
            {rows.length.toLocaleString("en-ZA")} of{" "}
            {waveRows.length.toLocaleString("en-ZA")} users
          </p>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" /> Download CSV
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={copyState === "copying"}
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            {copyState === "copying"
              ? "Copying…"
              : copyState === "copied"
                ? "Copied ✓"
                : copyState === "failed"
                  ? "Copy failed — tap to retry"
                  : "Copy list"}
          </button>
        </div>
      </div>

      {lifetimeEvidence && wave !== "all" ? (
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <UserHealthWaveFunnel
            counts={funnelCounts}
            days={days}
            wave={selectedWave}
            generatedAt={generatedAt}
          />
        </div>
      ) : null}

      {visibleUsers.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="font-semibold text-slate-800">No users match these filters</p>
          <p className="mt-1 text-sm text-slate-500">
            Clear the search or choose broader stage, blocker, or data filters.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[1260px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
                  <th className="px-4 py-3">EA identity</th>
                  <th className="px-4 py-3">Stage / blockers</th>
                  <th className="px-4 py-3">Auth / login</th>
                  <th className="px-4 py-3">Device signal</th>
                  <th className="px-4 py-3">Server data</th>
                  <th className="px-4 py-3">App activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((user) => (
                  <tr key={user.user_id} className="align-top hover:bg-slate-50/80">
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{user.display_name}</p>
                        <EmploymentBadge status={user.employment_status} />
                      </div>
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
                      <StageEvidence
                        user={user}
                        days={days}
                        lifetimeEvidence={lifetimeEvidence}
                      />
                      <AttentionReasons user={user} />
                    </td>
                    <td className="px-4 py-4"><AuthEvidence user={user} /></td>
                    <td className="px-4 py-4">
                      <DeviceEvidence
                        user={user}
                        lifetimeEvidence={lifetimeEvidence}
                      />
                    </td>
                    <td className="px-4 py-4"><DataEvidence user={user} /></td>
                    <td className="px-4 py-4">
                      <ActivityEvidence
                        user={user}
                        days={days}
                        schoolId={schoolId}
                      />
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
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{user.display_name}</h3>
                      <EmploymentBadge status={user.employment_status} />
                    </div>
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
                    <StageEvidence
                      user={user}
                      days={days}
                      lifetimeEvidence={lifetimeEvidence}
                    />
                    <AttentionReasons user={user} />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Auth / login
                    </p>
                    <AuthEvidence user={user} />
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Device signal
                    </p>
                    <DeviceEvidence
                      user={user}
                      lifetimeEvidence={lifetimeEvidence}
                    />
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
                    <ActivityEvidence
                      user={user}
                      days={days}
                      schoolId={schoolId}
                    />
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
