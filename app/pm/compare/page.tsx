import { GitCompare } from "lucide-react";

export default function ComparePage() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <GitCompare className="h-12 w-12 text-slate-300 mb-4" />
      <h1 className="text-2xl font-bold text-slate-900">Compare</h1>
      <p className="text-slate-500 mt-2 max-w-md">
        Side-by-side comparison of regions, cohorts, and school types.
        Coming in Phase 3.
      </p>
    </div>
  );
}
