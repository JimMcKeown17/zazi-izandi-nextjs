"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { buildSyncIncidentFilterHref } from "@/lib/mobile/sync-incidents/filter-navigation";
import type { MobileSyncIncidentKind } from "@/lib/mobile/sync-incidents/types";

export function SyncIncidentFilters({
  incidentKind,
  descriptorKey,
}: {
  incidentKind: MobileSyncIncidentKind | null;
  descriptorKey: string | null;
}) {
  const router = useRouter();
  const [pendingKind, setPendingKind] = useState(incidentKind ?? "");
  const [pendingDescriptor, setPendingDescriptor] = useState(
    descriptorKey ?? ""
  );
  const hasFilters = incidentKind !== null || descriptorKey !== null;

  function navigate(
    nextKind: MobileSyncIncidentKind | null,
    nextDescriptor: string | null
  ) {
    router.push(
      buildSyncIncidentFilterHref(window.location.search, {
        incidentKind: nextKind,
        descriptorKey: nextDescriptor,
      })
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        navigate(
          (pendingKind || null) as MobileSyncIncidentKind | null,
          pendingDescriptor || null
        );
      }}
      className="grid gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto_auto] sm:items-end"
      aria-label="Sync incident alert filters"
    >
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Receipt type
        <select
          value={pendingKind}
          onChange={(event) => setPendingKind(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All receipt types</option>
          <option value="support_root">Saved-change support</option>
          <option value="integrity_aggregate">Sync-integrity finding</option>
          <option value="queue_overflow">Coverage constrained</option>
        </select>
      </label>

      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Descriptor
        <input
          value={pendingDescriptor}
          onChange={(event) => setPendingDescriptor(event.target.value)}
          placeholder="e.g. TIME_ENTRIES"
          maxLength={64}
          pattern="[A-Za-z][A-Za-z0-9_]{0,63}"
          className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal uppercase normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <button
        type="submit"
        className="h-10 rounded-md bg-amber-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-2"
      >
        Apply alert filters
      </button>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setPendingKind("");
            setPendingDescriptor("");
            navigate(null, null);
          }}
          className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Clear alert filters
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
    </form>
  );
}

