import { ClipboardCheck } from "lucide-react";

export default function AssessmentsPage() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <ClipboardCheck className="h-12 w-12 text-slate-300 mb-4" />
      <h1 className="text-2xl font-bold text-slate-900">Assessments</h1>
      <p className="text-slate-500 mt-2 max-w-md">
        EGRA assessment outcomes, score distributions, and school comparisons.
        Coming in Phase 3.
      </p>
    </div>
  );
}
