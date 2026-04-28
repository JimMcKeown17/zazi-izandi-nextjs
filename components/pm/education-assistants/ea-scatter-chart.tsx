"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
  Customized,
} from "recharts";
import { Pause, Play } from "lucide-react";
import type {
  EAPerformanceItem,
  EAPerformanceHistoryResponse,
} from "@/lib/pm/types";
import { Slider } from "@/components/ui/slider";
import {
  alignmentAnchorAt,
  classifyMovement,
  pointAt,
  resolveWindowStartDate,
  type WindowMode,
  type MovementClass,
} from "@/lib/pm/ea-history-utils";
import { EADetailPanel } from "./ea-detail-panel";

const X_MID = 2.0;
const Y_MID = 67;

const QUADRANT_COLORS = {
  topRight: "#22c55e", // green
  topLeft: "#f59e0b", // amber
  bottomRight: "#f59e0b", // amber
  bottomLeft: "#ef4444", // red
} as const;

const ARROW_COLORS: Record<MovementClass, string> = {
  improved: "#16a34a", // green-600
  regressed: "#dc2626", // red-600
  stalled: "#94a3b8", // slate-400
};

function getQuadrantColor(x: number, y: number): string {
  if (x >= X_MID && y >= Y_MID) return QUADRANT_COLORS.topRight;
  if (x < X_MID && y >= Y_MID) return QUADRANT_COLORS.topLeft;
  if (x >= X_MID && y < Y_MID) return QUADRANT_COLORS.bottomRight;
  return QUADRANT_COLORS.bottomLeft;
}

interface EAScatterChartProps {
  eas: EAPerformanceItem[];
  history: EAPerformanceHistoryResponse;
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
        <p>
          Alignment:{" "}
          {ea.alignment_avg_score !== null ? `${ea.alignment_avg_score}%` : "—"}
        </p>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ArrowAnchor {
  ea_name: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  klass: MovementClass;
}

/**
 * Recharts <Customized /> overlay: draws a line + arrowhead from each EA's
 * window-start position to today's position. Read-only — no interaction.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function ArrowsOverlay(props: any) {
  const { xAxisMap, yAxisMap, anchors } = props;
  if (!xAxisMap || !yAxisMap || !anchors) return null;
  const xAxis: any = Object.values(xAxisMap)[0];
  const yAxis: any = Object.values(yAxisMap)[0];
  if (!xAxis || !yAxis) return null;
  const xScale = xAxis.scale;
  const yScale = yAxis.scale;

  return (
    <g>
      {(anchors as ArrowAnchor[]).map((a) => {
        const x1 = xScale(a.start.x);
        const y1 = yScale(a.start.y);
        const x2 = xScale(a.end.x);
        const y2 = yScale(a.end.y);
        if ([x1, y1, x2, y2].some((v) => Number.isNaN(v))) return null;

        // Arrowhead geometry
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 6;
        const headAngle = Math.PI / 6;
        const ax = x2 - headLen * Math.cos(angle - headAngle);
        const ay = y2 - headLen * Math.sin(angle - headAngle);
        const bx = x2 - headLen * Math.cos(angle + headAngle);
        const by = y2 - headLen * Math.sin(angle + headAngle);

        const color = ARROW_COLORS[a.klass];
        return (
          <g key={a.ea_name} pointerEvents="none">
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeOpacity={0.55}
              strokeWidth={1.5}
            />
            <polygon
              points={`${x2},${y2} ${ax},${ay} ${bx},${by}`}
              fill={color}
              fillOpacity={0.7}
            />
          </g>
        );
      })}
    </g>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function EAScatterChart({ eas, history }: EAScatterChartProps) {
  const [selectedEA, setSelectedEA] = useState<EAPerformanceItem | null>(null);
  const [windowMode, setWindowMode] = useState<WindowMode>("4w");
  const [arrowsVisible, setArrowsVisible] = useState(true);
  const [sliderIdx, setSliderIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  const hasHistory = history.dates.length > 0;
  const sliderActive = sliderIdx !== null;

  // ── Plottable EAs (today's mode) ──
  const plottable = useMemo(
    () => eas.filter((e) => e.alignment_avg_score !== null),
    [eas]
  );

  // ── Slider-mode dot projection ──
  const sliderDots = useMemo<EAPerformanceItem[] | null>(() => {
    if (sliderIdx === null) return null;
    const targetDate = history.dates[sliderIdx];
    if (!targetDate) return null;
    const result: EAPerformanceItem[] = [];
    for (const ea of history.eas) {
      const pt = pointAt(ea.trajectory, targetDate);
      if (!pt || pt.y === null) continue;
      result.push({
        ea_name: ea.ea_name,
        ea_user_id: ea.ea_user_id,
        school: ea.school,
        sessions_per_programme_day: pt.x,
        alignment_avg_score: pt.y,
        // Fields below are not meaningful for historical projections; the
        // detail panel is disabled in slider mode so they're never read.
        total_sessions: 0,
        groups_count: 0,
        letters_groups_count: 0,
        blending_groups_count: 0,
        children_count: 0,
        active_flags_count: 0,
        groups: [],
      });
    }
    return result;
  }, [sliderIdx, history]);

  const dotsToShow = sliderDots ?? plottable;

  // ── Axis domain: include both today's data and full history ──
  const maxX = useMemo(() => {
    const allX: number[] = [];
    for (const e of plottable) allX.push(e.sessions_per_programme_day);
    for (const ea of history.eas)
      for (const pt of ea.trajectory) allX.push(pt.x);
    return Math.max(4, Math.ceil(Math.max(...allX, 4)));
  }, [plottable, history]);

  // ── Arrow anchors ──
  // Anchored against latest snapshot date inside resolveWindowStartDate
  // (NOT wall-clock today), so arrows stay correct under cron lag and
  // UTC/local date-boundary edge cases.
  const arrowAnchors = useMemo<ArrowAnchor[]>(() => {
    if (!hasHistory) return [];
    const startISO = resolveWindowStartDate(history, windowMode);
    if (!startISO) return [];
    const anchors: ArrowAnchor[] = [];
    // Use plotted EAs as the anchor set so arrows align with visible dots.
    const plottedNames = new Set(plottable.map((p) => p.ea_name));
    for (const ea of history.eas) {
      if (!plottedNames.has(ea.ea_name)) continue;
      // alignmentAnchorAt falls forward to the first non-null-y point if no
      // earlier non-null one exists — rescues late-joining EAs whose
      // alignment data only starts after the requested window.
      const start = alignmentAnchorAt(ea.trajectory, startISO);
      const end = ea.trajectory[ea.trajectory.length - 1];
      if (!start || !end || start.y === null || end.y === null) continue;
      if (start.date === end.date) continue;
      const klass = classifyMovement(start, end);
      anchors.push({
        ea_name: ea.ea_name,
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
        klass,
      });
    }
    return anchors;
  }, [hasHistory, history, windowMode, plottable]);

  // ── Slider play loop ──
  // Gated on hasHistory so the interval cleans up automatically when a cohort
  // with no snapshot data is selected; no second effect / state reset needed.
  useEffect(() => {
    if (!playing || !hasHistory) return;
    const id = window.setInterval(() => {
      setSliderIdx((prev) => {
        const start = prev ?? 0;
        const next = start + 1;
        if (next >= history.dates.length) {
          setPlaying(false);
          // Land on resting state ("today") when animation completes.
          return null;
        }
        return next;
      });
    }, 250);
    playIntervalRef.current = id;
    return () => {
      window.clearInterval(id);
      playIntervalRef.current = null;
    };
  }, [playing, hasHistory, history.dates.length]);

  const handleClick = useCallback(
    (_: unknown, index: number) => {
      // Click-to-select disabled in slider mode (historical projections lack
      // the full EAPerformanceItem shape needed by the detail panel).
      if (sliderActive) return;
      setSelectedEA(plottable[index]);
    },
    [plottable, sliderActive]
  );

  const handleSliderChange = useCallback(
    (vals: number[]) => {
      const v = vals[0];
      if (v === history.dates.length - 1) {
        setSliderIdx(null);
      } else {
        setSliderIdx(v);
      }
      if (playing) setPlaying(false);
    },
    [history.dates.length, playing]
  );

  const sliderValue = sliderIdx ?? Math.max(history.dates.length - 1, 0);
  const currentSliderDate =
    sliderIdx !== null ? history.dates[sliderIdx] : "Today";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-5">
        {/* Chart header */}
        <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              EA Performance Map
            </h2>
            <p className="text-xs text-slate-500">
              {sliderActive
                ? "Animation mode — click a dot to select disabled"
                : "Click an EA to see details below"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
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
            <label className="flex items-center gap-1 cursor-pointer ml-2 select-none">
              <input
                type="checkbox"
                checked={arrowsVisible}
                onChange={(e) => setArrowsVisible(e.target.checked)}
                disabled={!hasHistory}
                className="accent-emerald-500"
              />
              Show arrows
            </label>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-4 mb-3 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Compare to:</span>
            <div className="flex rounded-md overflow-hidden border border-slate-200">
              {(["2w", "4w", "term"] as WindowMode[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWindowMode(w)}
                  disabled={!hasHistory}
                  className={`px-2.5 py-1 transition-colors ${
                    windowMode === w
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {w === "2w" ? "2w ago" : w === "4w" ? "4w ago" : "Since term start"}
                </button>
              ))}
            </div>
          </div>

          {hasHistory && (
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <span className="text-slate-500">Animate:</span>
              <button
                type="button"
                onClick={() => {
                  if (playing) {
                    setPlaying(false);
                  } else {
                    if (sliderIdx === null) setSliderIdx(0);
                    setPlaying(true);
                  }
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-700"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
              <Slider
                value={[sliderValue]}
                min={0}
                max={Math.max(history.dates.length - 1, 0)}
                step={1}
                onValueChange={handleSliderChange}
                className="flex-1 max-w-md"
              />
              <span className="text-slate-700 tabular-nums whitespace-nowrap">
                {currentSliderDate}
              </span>
            </div>
          )}
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
            <ReferenceLine x={X_MID} stroke="#cbd5e1" strokeDasharray="6 4" />
            <ReferenceLine y={Y_MID} stroke="#cbd5e1" strokeDasharray="6 4" />
            {arrowsVisible && !sliderActive && (
              <Customized
                component={ArrowsOverlay as any /* eslint-disable-line @typescript-eslint/no-explicit-any */}
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                {...({ anchors: arrowAnchors } as any)}
              />
            )}
            <Scatter
              data={dotsToShow}
              onClick={handleClick}
              cursor={sliderActive ? "default" : "pointer"}
              isAnimationActive={sliderActive}
              animationDuration={600}
            >
              {dotsToShow.map((ea) => (
                <Cell
                  key={`${ea.ea_name}-${ea.school}`}
                  fill={getQuadrantColor(
                    ea.sessions_per_programme_day,
                    ea.alignment_avg_score!
                  )}
                  stroke={
                    !sliderActive && selectedEA?.ea_name === ea.ea_name
                      ? "#1e293b"
                      : "white"
                  }
                  strokeWidth={
                    !sliderActive && selectedEA?.ea_name === ea.ea_name ? 2 : 1
                  }
                  r={
                    !sliderActive && selectedEA?.ea_name === ea.ea_name ? 7 : 5
                  }
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Detail panel */}
      {selectedEA && !sliderActive && (
        <EADetailPanel ea={selectedEA} onClose={() => setSelectedEA(null)} />
      )}
    </div>
  );
}
