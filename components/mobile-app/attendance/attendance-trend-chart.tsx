"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyClockPoint } from "@/lib/mobile/time-entries/daily-series";

const LABEL_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "2-digit",
  month: "short",
});

function formatDay(date: string): string {
  return LABEL_FORMAT.format(new Date(`${date}T12:00:00+02:00`));
}

export function AttendanceTrendChart({ series }: { series: DailyClockPoint[] }) {
  return (
    <div
      data-testid="attendance-trend"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="font-bold text-slate-900">EAs clocking in per day</h2>
      <p className="mt-1 text-xs text-slate-500">
        Distinct EAs with at least one clock-in, per SAST calendar day. During a
        rollout this line rising is the adoption signal.
      </p>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              // Params stay inferred and are normalized inside: Recharts 3 types
              // them as broad ValueType/label unions, so annotating them as
              // number/string fails the strict tsc gate.
              formatter={(value) => [`${Number(value)} EAs`, "Clocked in"]}
              labelFormatter={(label) => formatDay(String(label))}
              cursor={{ fill: "rgba(44, 90, 160, 0.08)" }}
            />
            <Bar dataKey="distinct_eas" fill="#2c5aa0" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
