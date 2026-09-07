import { LoaderCircle } from "lucide-react";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 motion-reduce:animate-none ${className}`}
      aria-hidden="true"
    />
  );
}

export default function PMLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-4"
      data-testid="pm-loading-page"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex min-h-16 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 shadow-sm">
        <LoaderCircle
          className="h-5 w-5 shrink-0 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Loading programme data…
          </p>
          <p className="text-xs text-slate-500">
            The dashboard will appear as soon as the latest figures are ready.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <SkeletonBlock className="mb-3 h-4 w-40" />
        <SkeletonBlock className="h-9 w-full" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            aria-hidden="true"
          >
            <SkeletonBlock className="mb-3 h-3 w-20" />
            <SkeletonBlock className="mb-2 h-7 w-16" />
            <SkeletonBlock className="h-3 w-28 max-w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
          <SkeletonBlock className="mb-5 h-4 w-36" />
          <SkeletonBlock className="h-56 w-full" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <SkeletonBlock className="mb-5 h-4 w-32" />
          <SkeletonBlock className="mx-auto h-56 w-56 max-w-full rounded-full" />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <SkeletonBlock className="mb-4 h-4 w-44" />
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
