"use client";

import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TeachingOverviewPortfolio } from "@/lib/pm/teaching-overview";

/* eslint-disable @typescript-eslint/no-explicit-any */
function TeachingTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const portfolio = payload[0].payload as TeachingOverviewPortfolio;
  return (
    <div className="max-w-80 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{portfolio.eaDisplayName}</p>
      <p className="mt-0.5 text-slate-500">
        {portfolio.currentGroupCount} current {portfolio.currentGroupCount === 1 ? "group" : "groups"}
      </p>
      <dl className="mt-2 space-y-1 text-slate-700">
        <div className="flex justify-between gap-4">
          <dt>Sessions per group</dt>
          <dd className="font-semibold">{portfolio.averageRecentSessionsPerGroup.toFixed(1)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Letter Focus</dt>
          <dd className="font-semibold">{portfolio.letterFocusScore?.toFixed(1)}%</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Usable groups</dt>
          <dd className="font-semibold">{portfolio.usableGroupCount} of {portfolio.currentGroupCount}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Scorable sessions</dt>
          <dd className="font-semibold">{portfolio.eligibleSessionCount}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Tracker started</dt>
          <dd className="font-semibold">
            {portfolio.trackerStartedCount}/{portfolio.rosterSize}
            {portfolio.trackerCoverage === null
              ? ""
              : ` (${(portfolio.trackerCoverage * 100).toFixed(0)}%)`}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>No recent session</dt>
          <dd className="font-semibold">{portfolio.inactiveGroupCount} groups</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Low tracker / ahead</dt>
          <dd className="font-semibold">{portfolio.lowTrackerGroupCount} / {portfolio.aheadEvidenceGroupCount} groups</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Evidence checks</dt>
          <dd className="font-semibold">
            {portfolio.recentUnscorableGroupCount === null
              ? "Not calculated"
              : `${portfolio.recentUnscorableGroupCount} groups`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function TeachingOverviewChart({
  portfolios,
  selectedEaId,
  onSelect,
}: {
  portfolios: TeachingOverviewPortfolio[];
  selectedEaId: string | null;
  onSelect: (eaUserId: string) => void;
}) {
  const plottable = portfolios.filter((portfolio) => portfolio.letterFocusScore !== null);
  if (plottable.length === 0) {
    return (
      <div
        className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-600"
        data-testid="teaching-overview-chart-empty"
      >
        No EA points can be plotted until this run has usable Letter Focus evidence.
      </div>
    );
  }

  const maxX = Math.max(
    4,
    Math.ceil(Math.max(...plottable.map((portfolio) => portfolio.averageRecentSessionsPerGroup)))
  );
  return (
    <div
      className="h-80 w-full"
      role="img"
      aria-label={`Letter Focus chart with ${plottable.length} EAs`}
      data-testid="teaching-overview-chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 18, bottom: 32, left: 14 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="averageRecentSessionsPerGroup"
            domain={[0, maxX]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            label={{
              value: "Average recent mobile sessions per current group",
              position: "bottom",
              offset: 14,
              style: { fontSize: 11, fill: "#64748b" },
            }}
          />
          <YAxis
            type="number"
            dataKey="letterFocusScore"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            label={{
              value: "Letter Focus Score (%)",
              angle: -90,
              position: "insideLeft",
              offset: 2,
              style: { fontSize: 11, fill: "#64748b", textAnchor: "middle" },
            }}
          />
          <Tooltip content={<TeachingTooltip />} />
          <Scatter
            data={plottable}
            fill="#2563eb"
            cursor="pointer"
            onClick={(_point, index) => {
              const portfolio = plottable[index];
              if (portfolio) onSelect(portfolio.eaUserId);
            }}
            isAnimationActive={false}
          >
            {plottable.map((portfolio) => {
              const selected = portfolio.eaUserId === selectedEaId;
              return (
                <Cell
                  key={portfolio.eaUserId}
                  fill="#2563eb"
                  stroke={selected ? "#0f172a" : "#ffffff"}
                  strokeWidth={selected ? 3 : 1.5}
                  r={selected ? 7 : 5}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
