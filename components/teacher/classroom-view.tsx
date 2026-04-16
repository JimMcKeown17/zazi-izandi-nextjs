"use client";

import { useState } from "react";
import type { ClassroomSummary } from "@/lib/teacher/types";
import { ClassroomKPIs } from "./classroom-kpis";
import { ClassroomLetterGrid } from "./classroom-letter-grid";
import { ClassroomChildrenChart } from "./classroom-children-chart";
import { ActivityStrip } from "./activity-strip";
import { ClassroomAlignmentPanel } from "./classroom-alignment-panel";
import { ClassroomSessionsPerGroupChart } from "./classroom-sessions-per-group-chart";
import { ClassroomSessionsPerChildChart } from "./classroom-sessions-per-child-chart";
import { ClassroomMobileTabs } from "./classroom-mobile-tabs";

interface Props {
  summary: ClassroomSummary;
  groupSessions: { group_name: string; total_sessions: number }[];
}

export function ClassroomView({ summary, groupSessions }: Props) {
  const [activeTab, setActiveTab] = useState<"results" | "programme">(
    "results"
  );

  return (
    <>
      {/* ── Desktop: both zones stacked with section headers ── */}
      <div className="hidden md:block space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            How my children are learning
          </h2>
          <div className="space-y-4">
            <ClassroomKPIs summary={summary} />
            <ClassroomLetterGrid summary={summary} />
            <ClassroomChildrenChart summary={summary} />
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            How my programme is running
          </h2>
          <div className="space-y-4">
            <ActivityStrip summary={summary} />
            <ClassroomAlignmentPanel summary={summary} />
            <ClassroomSessionsPerGroupChart
              summary={summary}
              groups={groupSessions}
            />
            <ClassroomSessionsPerChildChart summary={summary} />
          </div>
        </div>
      </div>

      {/* ── Mobile: tabbed, one zone at a time ── */}
      <div className="md:hidden pb-14">
        {activeTab === "results" && (
          <div className="space-y-3">
            <ClassroomKPIs summary={summary} />
            <ClassroomLetterGrid summary={summary} />
            <ClassroomChildrenChart summary={summary} />
          </div>
        )}

        {activeTab === "programme" && (
          <div className="space-y-3">
            <ActivityStrip summary={summary} />
            <ClassroomAlignmentPanel summary={summary} />
            <ClassroomSessionsPerGroupChart
              summary={summary}
              groups={groupSessions}
            />
            <ClassroomSessionsPerChildChart summary={summary} />
          </div>
        )}

        <ClassroomMobileTabs active={activeTab} onChange={setActiveTab} />
      </div>
    </>
  );
}
