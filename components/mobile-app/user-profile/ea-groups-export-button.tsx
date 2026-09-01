"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { downloadEaGroupsCsv } from "@/lib/mobile/ea-groups-export/download";

export function EaGroupsExportButton() {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function download() {
    setState("loading");
    setMessage("");
    try {
      await downloadEaGroupsCsv({
        fetchExport: () =>
          fetch("/mobile-app/exports/ea-groups", { cache: "no-store" }),
        createObjectUrl: (blob) => URL.createObjectURL(blob),
        revokeObjectUrl: (url) => URL.revokeObjectURL(url),
        createAnchor: () => document.createElement("a"),
        appendAnchor: (anchor) => document.body.appendChild(anchor as HTMLAnchorElement),
      });
      setState("idle");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The export could not be generated."
      );
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
      <button
        type="button"
        aria-label="Download EA groups CSV"
        onClick={download}
        disabled={state === "loading"}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {state === "loading" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {state === "loading" ? "Preparing CSV…" : "Download EA groups CSV"}
      </button>
      <p className="max-w-72 text-xs leading-relaxed text-slate-500 sm:text-right">
        Contains EA and learner-group operational data. Share only with
        authorised staff.
      </p>
      {state === "error" ? (
        <p role="alert" className="max-w-72 text-xs text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
