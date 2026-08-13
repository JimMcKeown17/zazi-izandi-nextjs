function cellColor(count: number): string {
  if (count === 0) return "bg-slate-100";
  if (count === 1) return "bg-green-100";
  if (count === 2) return "bg-green-300";
  if (count === 3) return "bg-green-500";
  if (count === 4) return "bg-green-600";
  return "bg-green-700";
}

function cellTextColor(count: number): string {
  return count <= 2 ? "text-slate-700" : "text-white";
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
  });
}

export function WeekdaySessionStrip({
  dates,
  cells,
}: {
  dates: string[];
  cells: number[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-slate-900">Recent weekday sessions</h2>
      <p className="mt-1 text-xs text-slate-500">
        Session counts for the latest ten South African weekdays.
      </p>
      <div className="mt-4 overflow-x-auto">
        <div className="flex min-w-[30rem] items-start gap-2">
          {dates.map((date, index) => {
            const count = cells[index] ?? 0;
            return (
              <div key={date} className="min-w-10 flex-1 text-center">
                <span
                  data-session-cell="true"
                  data-count={count}
                  aria-label={`${date}: ${count} sessions`}
                  className={`mx-auto block h-9 w-9 rounded-md text-xs font-semibold leading-9 ${cellColor(count)} ${cellTextColor(count)}`}
                >
                  {count}
                </span>
                <span className="mt-1 block text-[10px] text-slate-500">
                  {formatDate(date)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
