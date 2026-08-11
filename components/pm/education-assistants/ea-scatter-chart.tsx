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
  useXAxisScale,
  useYAxisScale,
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
import {
  eaIdentity,
  indexCurrentEAs,
  indexHistoricalEAs,
  stableEAKeys,
} from "@/lib/pm/ea-projection-utils";
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
  historyIsLive: boolean;
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
  ea_key: string;
  ea_name: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  klass: MovementClass;
}

/**
 * Draws a line + arrowhead from each EA's window-start position to its
 * current position. Renders as a child of <ScatterChart /> so the Recharts
 * 3.x `useXAxisScale` / `useYAxisScale` hooks return live scale functions.
 * Read-only — no interaction.
 */
function ArrowsOverlay({ anchors }: { anchors: ArrowAnchor[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;

  return (
    <g pointerEvents="none">
      {anchors.map((a) => {
        const x1 = xScale(a.start.x);
        const y1 = yScale(a.start.y);
        const x2 = xScale(a.end.x);
        const y2 = yScale(a.end.y);
        if (
          x1 === undefined || y1 === undefined ||
          x2 === undefined || y2 === undefined
        ) return null;

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 6;
        const headAngle = Math.PI / 6;
        const ax = x2 - headLen * Math.cos(angle - headAngle);
        const ay = y2 - headLen * Math.sin(angle - headAngle);
        const bx = x2 - headLen * Math.cos(angle + headAngle);
        const by = y2 - headLen * Math.sin(angle + headAngle);

        const color = ARROW_COLORS[a.klass];
        return (
          <g key={a.ea_key}>
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

export function EAScatterChart({
  eas,
  history,
  historyIsLive,
}: EAScatterChartProps) {
  const [selectedEA, setSelectedEA] = useState<EAPerformanceItem | null>(null);
  const [windowMode, setWindowMode] = useState<WindowMode>("4w");
  const [arrowsVisible, setArrowsVisible] = useState(false);
  const [sliderIdx, setSliderIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  const hasHistory = historyIsLive && history.dates.length >= 2;
  const sliderActive = sliderIdx !== null;

  // Stable EA roster — every dot array uses this ordering so Recharts animates
  // by *identity* (always-same index per EA) instead of mis-mapping when an
  // EA enters or leaves the visible set between dates. EAs without data at a
  // given date keep their array slot with alignment_avg_score=null; Recharts
  // skips rendering null-y dots but the index stays put.
  const stableEAOrder = useMemo(
    () => stableEAKeys(eas, history),
    [eas, history]
  );

  const placeholderItem = useCallback(
    (
      ea_key: string,
      ea_name: string,
      ea_user_id: number | null,
      school: string
    ): EAPerformanceItem => ({
      ea_key,
      ea_name,
      ea_user_id,
      school,
      sessions_per_programme_day: 0,
      alignment_avg_score: null,
      total_sessions: 0,
      groups_count: 0,
      letters_groups_count: 0,
      blending_groups_count: 0,
      children_count: 0,
      active_flags_count: 0,
      groups: [],
    }),
    []
  );

  // ── Plottable EAs (today's mode) — padded to the stable roster ──
  const plottable = useMemo(() => {
    const liveByKey = indexCurrentEAs(eas);
    const histByKey = indexHistoricalEAs(history);
    return stableEAOrder.map((key) => {
      const live = liveByKey.get(key);
      if (live) return live;
      const hist = histByKey.get(key);
      return placeholderItem(
        key,
        hist?.ea_name ?? key,
        hist?.ea_user_id ?? null,
        hist?.school ?? ""
      );
    });
  }, [eas, history, stableEAOrder, placeholderItem]);

  // ── Slider-mode dot projection — padded to the stable roster ──
  const sliderDots = useMemo<EAPerformanceItem[] | null>(() => {
    if (sliderIdx === null) return null;
    const targetDate = history.dates[sliderIdx];
    if (!targetDate) return null;
    const histByKey = indexHistoricalEAs(history);
    return stableEAOrder.map((key) => {
      const ea = histByKey.get(key);
      if (!ea) return placeholderItem(key, key, null, "");
      const pt = pointAt(ea.trajectory, targetDate);
      if (!pt || pt.y === null) {
        return placeholderItem(
          key,
          ea.ea_name,
          ea.ea_user_id,
          ea.school
        );
      }
      return {
        ea_key: ea.ea_key,
        ea_name: ea.ea_name,
        ea_user_id: ea.ea_user_id,
        school: ea.school,
        sessions_per_programme_day: pt.x,
        alignment_avg_score: pt.y,
        total_sessions: 0,
        groups_count: 0,
        letters_groups_count: 0,
        blending_groups_count: 0,
        children_count: 0,
        active_flags_count: 0,
        groups: [],
      };
    });
  }, [sliderIdx, history, stableEAOrder, placeholderItem]);

  const dotsToShow = sliderDots ?? plottable;

  // ── Axis domain: hard cap at 5 (matches the existing site's range, per
  // user preference). Outliers above 5 (rare, often data-quality artefacts)
  // are clipped — the user explicitly accepted this trade for the tighter,
  // more readable resting axis.
  const maxX = 5;

  // ── Current "viewing date": slider date when active, else latest snapshot.
  // Arrows anchor their END to this date so they stay meaningful during scrub
  // (arrow tail moves backward by the chosen window from wherever the slider
  // currently sits). When sliderIdx is null, the END is today's data point.
  const viewingDateISO = useMemo(() => {
    if (sliderIdx !== null) return history.dates[sliderIdx] ?? null;
    return history.dates[history.dates.length - 1] ?? null;
  }, [sliderIdx, history.dates]);

  // ── Arrow anchors ──
  // Both endpoints (live + history) are anchored to the same snapshot date
  // server-side, so arrow-end (history's trajectory at viewingDate) and the
  // rendered dot's coordinates now match. The arrow vector is pure-history:
  // start = window-back from viewingDate, end = at viewingDate.
  const arrowAnchors = useMemo<ArrowAnchor[]>(() => {
    if (!hasHistory || !viewingDateISO) return [];
    const startISO = resolveWindowStartDate(history, windowMode, viewingDateISO);
    if (!startISO) return [];
    const histByKey = indexHistoricalEAs(history);
    const anchors: ArrowAnchor[] = [];
    for (const dot of dotsToShow) {
      if (dot.alignment_avg_score === null) continue; // placeholder, no dot
      const ea = histByKey.get(eaIdentity(dot));
      if (!ea) continue;
      const start = alignmentAnchorAt(ea.trajectory, startISO);
      const end = alignmentAnchorAt(ea.trajectory, viewingDateISO);
      if (!start || !end || start.y === null || end.y === null) continue;
      if (start.date === end.date) continue;
      const klass = classifyMovement(start, end);
      anchors.push({
        ea_key: dot.ea_key,
        ea_name: dot.ea_name,
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
        klass,
      });
    }
    return anchors;
  }, [hasHistory, history, windowMode, viewingDateISO, dotsToShow]);

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
      const ea = plottable[index];
      // Placeholders (null-y) hold an array slot for animation stability but
      // don't render — they shouldn't normally be clickable, but guard in
      // case Recharts ever passes one through.
      if (!ea || ea.alignment_avg_score === null) return;
      setSelectedEA(ea);
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
              // Without this Recharts auto-expands the domain to fit any
              // outlier dot, so the axis snaps from 5 → 7 when today's data
              // contains an EA with sessions/day > 5. We want a hard cap.
              allowDataOverflow
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
            {arrowsVisible && <ArrowsOverlay anchors={arrowAnchors} />}
            <Scatter
              data={dotsToShow}
              onClick={handleClick}
              cursor={sliderActive ? "default" : "pointer"}
              // Animation must stay on across the slider→today transition,
              // otherwise the final tick paints instantly with no
              // interpolation. Cost: a small entry animation on first
              // render (dots fade in), which is fine.
              isAnimationActive
              animationDuration={600}
            >
              {dotsToShow.map((ea) => {
                // Placeholder rows (null-y) keep the array length stable
                // across dates so Recharts animates by EA identity. They
                // don't render to the SVG (Recharts skips null-y points)
                // — Cell colour is irrelevant but needs to be a string.
                const isPlaceholder = ea.alignment_avg_score === null;
                const isSelected =
                  !sliderActive && selectedEA?.ea_key === ea.ea_key;
                return (
                  <Cell
                    key={ea.ea_key}
                    fill={
                      isPlaceholder
                        ? "transparent"
                        : getQuadrantColor(
                            ea.sessions_per_programme_day,
                            ea.alignment_avg_score!
                          )
                    }
                    stroke={isSelected ? "#1e293b" : "white"}
                    strokeWidth={isSelected ? 2 : 1}
                    r={isSelected ? 7 : 5}
                  />
                );
              })}
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
