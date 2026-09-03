"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  buildPayPeriodWindows,
  defaultSessionExportRange,
  resolveSessionExportDates,
  validateSessionExportRange,
} from "@/lib/mobile/session-exports/date-range";
import {
  DETAIL_EXPORT_KIND,
  PAYROLL_EXPORT_KIND,
  type SessionExportKind,
} from "@/lib/mobile/session-exports/transport";
import { downloadSessionExport } from "@/lib/mobile/session-exports/download";

export function SessionExportsPanel({
  today,
  schoolId,
  schoolType,
}: {
  today: string;
  schoolId: string | null;
  schoolType: "ecd" | "primary" | null;
}) {
  const windows = useMemo(() => buildPayPeriodWindows(today), [today]);
  const initial = useMemo(() => defaultSessionExportRange(today), [today]);
  const [mode, setMode] = useState<"pay-period" | "custom">(initial.source);
  const [selectedPayRun, setSelectedPayRun] = useState(initial.payRunDate ?? "");
  const [customStartDate, setCustomStartDate] = useState(initial.startDate);
  const [customEndDate, setCustomEndDate] = useState(initial.endDate);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { startDate, endDate } = resolveSessionExportDates({
    mode,
    windows,
    selectedPayRun,
    customStartDate,
    customEndDate,
  });

  function choosePayRun(payRunDate: string) {
    setSelectedPayRun(payRunDate);
  }

  function download(kind: SessionExportKind) {
    setMessage("");
    try {
      validateSessionExportRange({ startDate, endDate, today });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Choose a valid date range.");
      return;
    }
    startTransition(async () => {
      try {
        setMessage(await downloadSessionExport({
          kind,
          startDate,
          endDate,
          schoolId,
          schoolType,
        }));
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "The export could not be generated."
        );
      }
    });
  }

  return (
    <section
      data-testid="mobile-session-exports"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-slate-900">
          Download session records
        </h2>
        <p className="text-xs text-slate-500">
          *Unsynced sessions may not be reflected yet.
        </p>
      </div>

      <div
        className={
          mode === "pay-period"
            ? "mt-3 grid gap-3 sm:grid-cols-2 sm:items-end lg:grid-cols-[8rem_minmax(11rem,1fr)_auto_auto]"
            : "mt-3 grid gap-3 sm:grid-cols-2 sm:items-end xl:grid-cols-[8rem_minmax(22rem,1fr)_auto_auto]"
        }
      >
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Range type
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as "pay-period" | "custom")}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="pay-period" disabled={windows.length === 0}>Pay-run window</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>

        {mode === "pay-period" ? (
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pay-run window
            <select
              value={selectedPayRun}
              onChange={(event) => choosePayRun(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {windows.map((window) => (
                <option key={window.payRunDate} value={window.payRunDate}>
                  {window.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-1">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Start date
              <input
                type="date"
                value={customStartDate}
                max={today}
                onChange={(event) => setCustomStartDate(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              End date
              <input
                type="date"
                value={customEndDate}
                max={today}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
        )}

        <ExportButton
          label="Payroll summary"
          pending={isPending}
          onClick={() => download(PAYROLL_EXPORT_KIND)}
        />
        <ExportButton
          label="Session detail"
          pending={isPending}
          onClick={() => download(DETAIL_EXPORT_KIND)}
        />
      </div>

      <SessionExportStatus pending={isPending} message={message} />
    </section>
  );
}

export function SessionExportStatus({
  pending,
  message,
}: {
  pending: boolean;
  message: string;
}) {
  return (
    <p
      aria-live="polite"
      className={pending || message ? "mt-2 text-xs text-slate-600" : "sr-only"}
    >
      {pending ? "Preparing the CSV from the live server snapshot…" : message}
    </p>
  );
}

function ExportButton({
  label,
  pending,
  onClick,
}: {
  label: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Download ${label.toLowerCase()}`}
      disabled={pending}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
