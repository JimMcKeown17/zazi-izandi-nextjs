import { Calendar } from "lucide-react";

export default function SessionsPage() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Calendar className="h-12 w-12 text-slate-300 mb-4" />
      <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
      <p className="text-slate-500 mt-2 max-w-md">
        Session activity tracking, EA heatmaps, and dosage analysis.
        Coming in Phase 2.
      </p>
    </div>
  );
}
