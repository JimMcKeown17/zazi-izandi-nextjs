import { getEmploymentStatusDisplay } from "@/lib/mobile/presentation";

export function EmploymentBadge({ status }: { status: string | null }) {
  const display = getEmploymentStatusDisplay(status);
  if (!display || display.kind === "active") return null;

  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {display.label}
    </span>
  );
}
