"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SessionTimeSeriesPoint } from "@/lib/pm/types";
import { CHART_COLORS } from "@/lib/pm/constants";
import { shouldShowOtherTrend } from "@/lib/mobile/presentation";

type SessionTrendPoint = SessionTimeSeriesPoint & { other?: number };

interface Props {
  data: SessionTrendPoint[];
  subtitle?: string;
  otherLabel?: string;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function SessionsTrendChart({
  data,
  subtitle = "Sessions per day by school type",
  otherLabel = "Other",
}: Props) {
  const formatted = data.map((pt) => ({
    ...pt,
    label: formatDate(pt.date),
  }));
  const showOther = shouldShowOtherTrend(data);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">Daily Session Trend</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[260px] text-sm text-slate-400">
          No session data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: CHART_COLORS.text }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: CHART_COLORS.text }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="primary"
              name="Primary"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            {showOther ? (
              <Line
                type="monotone"
                dataKey="other"
                name={otherLabel}
                stroke={CHART_COLORS.other}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="ecd"
              name="ECD"
              stroke={CHART_COLORS.ecd}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Total"
              stroke={CHART_COLORS.total}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
