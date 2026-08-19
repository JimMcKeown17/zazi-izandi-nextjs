"use client";

import Link from "next/link";
import { useState } from "react";
import { Download } from "lucide-react";
import { getEmploymentStatusDisplay } from "@/lib/mobile/presentation";

export interface SessionHeatmapRow {
  row_id?: string;
  ea_name: string;
  school: string;
  employment_status?: string | null;
  cells: number[];
  total_sessions?: number;
}

interface Props {
  dates: string[];
  eas: SessionHeatmapRow[];
  schoolColumnLabel?: string;
  subtitle?: string;
  profileLinkEnabled?: boolean;
  /**
   * When set, a "Download CSV" button is shown that exports the currently
   * visible (searched + sorted) rows. The value is the filename prefix; a
   * YYYY-MM-DD stamp and `.csv` are appended. Omit to hide the button (e.g. on
   * the PM dashboard where export is not offered).
   */
  exportFilenamePrefix?: string;
}

/** RFC 4180 field escaping: quote when the value contains a comma, quote, or newline. */
function csvField(value: string | number): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function cellColor(count: number): string {
  if (count === 0) return "bg-slate-100";
  if (count === 1) return "bg-green-100";
  if (count === 2) return "bg-green-300";
  if (count === 3) return "bg-green-500";
  if (count === 4) return "bg-green-600";
  return "bg-green-700"; // 5+
}

function cellTextColor(count: number): string {
  if (count <= 2) return "text-slate-700";
  return "text-white";
}

function formatDate(dateStr: string): string {
  // Parse as local date to avoid UTC timezone shift (YYYY-MM-DD → wrong day in non-UTC zones)
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric" });
}

export function EAHeatmap({
  dates,
  eas,
  schoolColumnLabel = "School",
  subtitle = "Sessions per day — last 10 weekdays",
  profileLinkEnabled = false,
  exportFilenamePrefix,
}: Props) {
  const [search, setSearch] = useState("");

  // Reverse dates so most recent is on the left
  const reversedDates = [...dates].reverse();

  const searchFiltered = search
    ? eas.filter(
        (ea) =>
          ea.ea_name.toLowerCase().includes(search.toLowerCase()) ||
          ea.school.toLowerCase().includes(search.toLowerCase())
      )
    : eas;

  // Sort by total sessions descending
  const filtered = [...searchFiltered].sort((a, b) => {
    const totalA = a.total_sessions ?? a.cells.reduce((s, c) => s + c, 0);
    const totalB = b.total_sessions ?? b.cells.reduce((s, c) => s + c, 0);
    return totalB - totalA;
  });

  // Exports exactly what is on screen: the searched + sorted rows, columns in
  // the same order (most-recent weekday first), Total last. ISO dates are used
  // for spreadsheet-friendly headers.
  function downloadCsv() {
    const header = [
      "EA",
      schoolColumnLabel,
      "Status",
      ...reversedDates,
      "Total",
    ];
    const body = filtered.map((ea) => {
      const reversedCells = [...ea.cells].reverse();
      const total = ea.total_sessions ?? ea.cells.reduce((a, b) => a + b, 0);
      const status = getEmploymentStatusDisplay(ea.employment_status);
      return [
        ea.ea_name,
        ea.school,
        status?.label ?? "",
        ...reversedCells,
        total,
      ];
    });
    const csv = [header, ...body]
      .map((row) => row.map(csvField).join(","))
      .join("\r\n");
    // Prepend a UTF-8 BOM so Excel renders accented EA names correctly.
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFilenamePrefix}-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">EA Activity Heatmap</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search EA or school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 w-48"
          />
          {exportFilenamePrefix && eas.length > 0 ? (
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              title="Download the rows shown as a CSV"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          ) : null}
        </div>
      </div>

      {eas.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-slate-400">
          No EA data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left py-1 pr-2 font-medium min-w-[140px]">EA</th>
                <th className="text-left py-1 pr-2 font-medium min-w-[120px]">
                  {schoolColumnLabel}
                </th>
                {reversedDates.map((d) => (
                  <th key={d} className="text-center py-1 px-1 font-medium min-w-[40px]">
                    {formatDate(d)}
                  </th>
                ))}
                <th className="text-center py-1 pl-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ea) => {
                const total =
                  ea.total_sessions ?? ea.cells.reduce((a, b) => a + b, 0);
                const reversedCells = [...ea.cells].reverse();
                const employmentStatus = getEmploymentStatusDisplay(
                  ea.employment_status
                );
                const employmentStatusClass =
                  employmentStatus?.kind === "active"
                    ? "bg-green-50 text-green-700"
                    : employmentStatus?.kind === "inactive"
                      ? "bg-amber-50 text-amber-700"
                      : employmentStatus?.kind === "resigned"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-red-50 text-red-700";
                return (
                  <tr
                    key={ea.row_id ?? `${ea.ea_name}:${ea.school}`}
                    className="border-t border-slate-50"
                  >
                    <td className="max-w-[140px] py-1 pr-2 text-slate-800">
                      <span className="block truncate font-medium">
                        {profileLinkEnabled && ea.row_id ? (
                          <Link
                            href={`/mobile-app/users/${ea.row_id}`}
                            className="hover:underline"
                          >
                            {ea.ea_name}
                          </Link>
                        ) : (
                          ea.ea_name
                        )}
                      </span>
                      {employmentStatus ? (
                        <span
                          aria-label={`Employment status: ${employmentStatus.label}`}
                          className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${employmentStatusClass}`}
                        >
                          {employmentStatus.label}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1 pr-2 text-slate-500 truncate max-w-[120px]">
                      {ea.school}
                    </td>
                    {reversedCells.map((count, i) => (
                      <td key={i} className="py-1 px-1 text-center">
                        <span
                          className={`inline-block w-7 h-6 rounded text-[10px] leading-6 font-medium ${cellColor(count)} ${cellTextColor(count)}`}
                        >
                          {count}
                        </span>
                      </td>
                    ))}
                    <td className="py-1 pl-2 text-center font-semibold text-slate-800">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
        <span>Sessions:</span>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`inline-block w-5 h-4 rounded text-center leading-4 ${cellColor(n)} ${cellTextColor(n)}`}
          >
            {n === 5 ? "5+" : n}
          </span>
        ))}
      </div>
    </div>
  );
}
