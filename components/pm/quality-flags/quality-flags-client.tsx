"use client";

import { useState } from "react";
import type { GroupSummary } from "@/lib/pm/types";
import { FlagSummaryCards } from "./flag-summary-cards";
import { EAFlagSummary } from "./ea-flag-summary";
import { FlaggedItemsTable } from "./flagged-items-table";

interface Props {
  groups: GroupSummary[];
}

export function QualityFlagsClient({ groups }: Props) {
  const [selectedEA, setSelectedEA] = useState<string | null>(null);

  return (
    <>
      {/* Flag summary cards */}
      <FlagSummaryCards groups={groups} />

      {/* EA Flag Summary — ranks EAs by quality flag severity */}
      <EAFlagSummary
        groups={groups}
        onSelectEA={setSelectedEA}
        selectedEA={selectedEA}
      />

      {/* Flagged items table — with EA filter and evidence panel */}
      <FlaggedItemsTable
        groups={groups}
        eaFilter={selectedEA}
        onClearEaFilter={() => setSelectedEA(null)}
      />
    </>
  );
}
