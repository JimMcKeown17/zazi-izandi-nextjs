"use client";

import { Download, FileSpreadsheet, LoaderCircle } from "lucide-react";
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
  const [mode, setMode] = useState<"pay-period" | "custom"> (initial.source);
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
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">Download session records</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Choose a closed-date pay-run window or your own date range. The payroll
            summary has one row per EA and one column per calendar date; session
            detail has one row per uploaded teaching session.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="text-sm font-medium text-slate-700">
          Range type
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as "pay-period" | "custom")}
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="pay-period" disabled={windows.length === 0}>Pay-run window</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>

        {mode === "pay-period" ? (
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Pay-run window
            <select
              value={selectedPayRun}
              onChange={(event) => choosePayRun(event.target.value)}
              className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {windows.map((window) => (
                <option key={window.payRunDate} value={window.payRunDate}>
                  {window.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="text-sm font-medium text-slate-700">
              Start date
              <input
                type="date"
                value={customStartDate}
                max={today}
                onChange={(event) => setCustomStartDate(event.target.value)}
                className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              End date
              <input
                type="date"
                value={customEndDate}
                max={today}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              />
            </label>
          </>
        )}
      </div>

      <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
        This is a live server snapshot, not a payroll lock. Sessions still held
        offline on a phone are absent, so a later download of the same period can
        change. The files contain staff and programme operations data; share them
        only through approved staff channels.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <ExportButton
          label="Download payroll summary"
          pending={isPending}
          onClick={() => download(PAYROLL_EXPORT_KIND)}
        />
        <ExportButton
          label="Download session detail"
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
    <p aria-live="polite" className="mt-2 min-h-5 text-xs text-slate-600">
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
      disabled={pending}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
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
