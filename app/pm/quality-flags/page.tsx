import { AlertTriangle } from "lucide-react";

export default function QualityFlagsPage() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <AlertTriangle className="h-12 w-12 text-slate-300 mb-4" />
      <h1 className="text-2xl font-bold text-slate-900">Quality Flags</h1>
      <p className="text-slate-500 mt-2 max-w-md">
        Centralized quality monitoring with flag lifecycle tracking and resolution rates.
        Coming in Phase 2.
      </p>
    </div>
  );
}
