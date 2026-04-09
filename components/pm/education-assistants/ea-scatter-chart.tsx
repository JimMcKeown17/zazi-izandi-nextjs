"use client";

import { useState, useCallback } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { EAPerformanceItem } from "@/lib/pm/types";
import { EADetailPanel } from "./ea-detail-panel";

const X_MID = 2.0;
const Y_MID = 50;

const QUADRANT_COLORS = {
  topRight: "#22c55e",   // green
  topLeft: "#f59e0b",    // amber
  bottomRight: "#f59e0b", // amber
  bottomLeft: "#ef4444", // red
} as const;

function getQuadrantColor(x: number, y: number): string {
  if (x >= X_MID && y >= Y_MID) return QUADRANT_COLORS.topRight;
  if (x < X_MID && y >= Y_MID) return QUADRANT_COLORS.topLeft;
  if (x >= X_MID && y < Y_MID) return QUADRANT_COLORS.bottomRight;
  return QUADRANT_COLORS.bottomLeft;
}

interface EAScatterChartProps {
  eas: EAPerformanceItem[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const ea = payload[0].payload as EAPerformanceItem;
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-slate-900">{ea.ea_name}</p>
      <p className="text-slate-500 text-xs">{ea.school}</p>
      <div className="mt-1 space-y-0.5 text-xs text-slate-600">
        <p>Sessions/day: {ea.sessions_per_programme_day}</p>
        <p>Alignment: {ea.alignment_avg_score}%</p>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function EAScatterChart({ eas }: EAScatterChartProps) {
  const [selectedEA, setSelectedEA] = useState<EAPerformanceItem | null>(null);

  // Only plot EAs with alignment data
  const plottable = eas.filter((e) => e.alignment_avg_score !== null);

  // Compute X-axis max (round up to nearest integer, min 4)
  const maxX = Math.max(
    4,
    Math.ceil(
      Math.max(...plottable.map((e) => e.sessions_per_programme_day), 4)
    )
  );

  const handleClick = useCallback(
    (_: unknown, index: number) => {
      setSelectedEA(plottable[index]);
    },
    [plottable]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-5">
        {/* Chart header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              EA Performance Map
            </h2>
            <p className="text-xs text-slate-500">
              Click an EA to see details below
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: QUADRANT_COLORS.topRight }}
              />
              High quality + dosage
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: QUADRANT_COLORS.topLeft }}
              />
              Mixed
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: QUADRANT_COLORS.bottomLeft }}
              />
              Needs support
            </span>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="sessions_per_programme_day"
              name="Sessions/Day"
              domain={[0, maxX]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              label={{
                value: "Avg Sessions / Programme Day",
                position: "bottom",
                offset: 8,
                style: { fontSize: 11, fill: "#94a3b8" },
              }}
            />
            <YAxis
              type="number"
              dataKey="alignment_avg_score"
              name="Alignment"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              label={{
                value: "Letter Alignment Score (%)",
                angle: -90,
                position: "insideLeft",
                offset: 4,
                style: { fontSize: 11, fill: "#94a3b8", textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={X_MID}
              stroke="#cbd5e1"
              strokeDasharray="6 4"
            />
            <ReferenceLine
              y={Y_MID}
              stroke="#cbd5e1"
              strokeDasharray="6 4"
            />
            <Scatter
              data={plottable}
              onClick={handleClick}
              cursor="pointer"
            >
              {plottable.map((ea) => (
                <Cell
                  key={`${ea.ea_name}-${ea.school}`}
                  fill={getQuadrantColor(
                    ea.sessions_per_programme_day,
                    ea.alignment_avg_score!
                  )}
                  stroke={
                    selectedEA?.ea_name === ea.ea_name ? "#1e293b" : "white"
                  }
                  strokeWidth={selectedEA?.ea_name === ea.ea_name ? 2 : 1}
                  r={selectedEA?.ea_name === ea.ea_name ? 7 : 5}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Detail panel */}
      {selectedEA && (
        <EADetailPanel
          ea={selectedEA}
          onClose={() => setSelectedEA(null)}
        />
      )}
    </div>
  );
}
