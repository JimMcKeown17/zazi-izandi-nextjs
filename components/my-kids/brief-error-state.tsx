"use client";

import { CloudOff, RotateCcw } from "lucide-react";

export function BriefErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <CloudOff
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          aria-hidden
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">
            We can&apos;t build your plan right now.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800">
            This is usually a brief connection issue. Try again in a minute.
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
