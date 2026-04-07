import type { FlagEvidenceSession } from "@/lib/pm/types";

interface Props {
  sessions: FlagEvidenceSession[];
  maxSessions?: number;
}

export function RecentSessionsPanel({ sessions, maxSessions = 4 }: Props) {
  // Show most recent N sessions
  const recent = sessions.slice(-maxSessions).reverse();

  if (recent.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic p-2">
        No session data available.
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-2">
        Recent Sessions ({recent.length})
      </p>
      <div className="space-y-2">
        {recent.map((s, i) => (
          <div
            key={`${s.session_id}-${i}`}
            className="bg-white rounded border border-slate-200 p-2"
          >
            <p className="text-[10px] text-slate-500 mb-1">{s.date}</p>
            <div className="flex flex-wrap gap-1">
              {s.letters_taught.length > 0 ? (
                s.letters_taught.map((letter, j) => (
                  <span
                    key={`${letter}-${j}`}
                    className="w-5 h-5 flex items-center justify-center rounded-sm bg-blue-100 text-blue-700 text-[9px] font-mono font-bold"
                  >
                    {letter}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-300 italic">no letters recorded</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
