"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";

export function TimeEntryExportButton({
  days,
  schoolId,
  schoolType,
}: {
  days: number;
  schoolId: string | null;
  schoolType: string | null;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function download() {
    setState("loading");
    setMessage("");
    const query = new URLSearchParams({ days: String(days) });
    if (schoolId) query.set("school_id", schoolId);
    if (schoolType) query.set("school_type", schoolType);

    try {
      const response = await fetch(
        `/mobile-app/exports/time-entries?${query.toString()}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "The export could not be generated.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `zazi-time-entries-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
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
    <div className="flex flex-col items-stretch gap-1.5">
      <button
        type="button"
        onClick={download}
        disabled={state === "loading"}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {state === "loading" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {state === "loading" ? "Preparing CSV…" : "Download CSV"}
      </button>
      {state === "error" ? (
        <p role="alert" className="max-w-64 text-xs text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
