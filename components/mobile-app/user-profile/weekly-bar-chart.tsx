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

import type { MobileUserProfileWeeklyRow } from "@/lib/mobile/user-profile/types";

export type WeeklyProfileDataKey =
  | "clock_days"
  | "clock_minutes_completed"
  | "sessions"
  | "app_assessments";

const WEEK_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "2-digit",
  month: "short",
});

const LATEST_LABELS: Record<WeeklyProfileDataKey, string> = {
  clock_days: "clock days",
  clock_minutes_completed: "completed clock minutes",
  sessions: "sessions",
  app_assessments: "app assessments",
};

function formatWeek(value: string): string {
  return WEEK_FORMAT.format(new Date(`${value}T12:00:00+02:00`));
}

export function WeeklyBarChart({
  title,
  description,
  series,
  dataKey,
}: {
  title: string;
  description: string;
  series: MobileUserProfileWeeklyRow[];
  dataKey: WeeklyProfileDataKey;
}) {
  const latestValue = series.at(-1)?.[dataKey] ?? 0;

  return (
    <section
      data-weekly-chart="true"
      data-testid={`weekly-chart-${dataKey}`}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 min-h-8 text-xs leading-relaxed text-slate-500">
        {description}
      </p>
      <p className="sr-only">
        Latest week: {latestValue} {LATEST_LABELS[dataKey]}
      </p>
      <div className="mt-3 h-44">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 560, height: 176 }}
        >
          <BarChart
            data={series}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="week_start"
              tickFormatter={formatWeek}
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [
                Number(value).toLocaleString("en-ZA"),
                LATEST_LABELS[dataKey],
              ]}
              labelFormatter={(label) => `Week of ${formatWeek(String(label))}`}
              cursor={{ fill: "rgba(44, 90, 160, 0.08)" }}
            />
            <Bar
              dataKey={dataKey}
              fill="#2c5aa0"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function ProfileWeeklyTrends({
  series,
}: {
  series: MobileUserProfileWeeklyRow[];
}) {
  return (
    <section aria-labelledby="weekly-trends-title">
      <div>
        <h2 id="weekly-trends-title" className="font-bold text-slate-900">
          Weekly trends
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Twenty-six complete, zero-filled ISO-week buckets, oldest to newest.
        </p>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <WeeklyBarChart
          title="Clock days per week"
          description="Distinct South African calendar days with at least one clock-in."
          series={series}
          dataKey="clock_days"
        />
        <WeeklyBarChart
          title="Completed clock minutes per week"
          description="Recorded minutes from completed clock entries only."
          series={series}
          dataKey="clock_minutes_completed"
        />
        <WeeklyBarChart
          title="Sessions per week"
          description="Literacy Coach sessions recorded for this EA."
          series={series}
          dataKey="sessions"
        />
        <WeeklyBarChart
          title="App assessments per week"
          description="Assessment records captured in the app; this is activity evidence."
          series={series}
          dataKey="app_assessments"
        />
      </div>
    </section>
  );
}
