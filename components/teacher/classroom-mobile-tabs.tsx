"use client";

type Tab = "results" | "programme";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function ClassroomMobileTabs({ active, onChange }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden print:hidden border-t border-slate-200 bg-white">
      <div className="grid grid-cols-2 h-11">
        <button
          onClick={() => onChange("results")}
          className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
            active === "results"
              ? "text-primary border-t-2 border-primary font-semibold"
              : "text-slate-400"
          }`}
        >
          <span className="text-sm">📊</span>
          <span>Results</span>
        </button>
        <button
          onClick={() => onChange("programme")}
          className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
            active === "programme"
              ? "text-primary border-t-2 border-primary font-semibold"
              : "text-slate-400"
          }`}
        >
          <span className="text-sm">👩‍🏫</span>
          <span>Programme</span>
        </button>
      </div>
    </div>
  );
}
