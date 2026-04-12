import { AlertTriangle } from "lucide-react";

export function BackendErrorState() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        Something went wrong
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        We&apos;re having trouble loading your data. Please try again in a few
        minutes.
      </p>
    </div>
  );
}
