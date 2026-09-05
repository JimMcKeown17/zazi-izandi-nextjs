"use client";

import { Download } from "lucide-react";

export function FidelityExportButton({
  csv,
  dateStamp,
}: {
  csv: string;
  dateStamp: string;
}) {
  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `programme-fidelity-coaching-queue-${dateStamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
    >
      <Download className="h-3.5 w-3.5" /> Download coaching CSV
    </button>
  );
}
