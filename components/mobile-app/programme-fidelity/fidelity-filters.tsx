import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import type {
  ProgrammeFidelityFilters as Filters,
  ProgrammeFidelityResponse,
} from "@/lib/mobile/programme-fidelity/types";

interface FidelityFilterFieldsProps {
  filters: Filters;
  options: ProgrammeFidelityResponse["filter_options"];
  causalAvailable: boolean;
}

function FidelityFilterFields({
  filters,
  options,
  causalAvailable,
}: FidelityFilterFieldsProps) {
  return (
    <>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        School
        <select
          name="school_id"
          defaultValue={filters.schoolId ?? ""}
          className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All schools</option>
          {options.schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        EA
        <select
          name="ea_user_id"
          defaultValue={filters.eaUserId ?? ""}
          className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All EAs</option>
          {options.eas.map((ea) => (
            <option key={ea.id} value={ea.id}>
              {ea.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Attention view
        <select
          name="attention"
          defaultValue={filters.attention}
          className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All — attention first</option>
          <option value="current">Current tracker/data checks</option>
          <option value="inactive">No sessions in 14 days</option>
          <option value="above" disabled={!causalAvailable}>
            Teaching above frontier {!causalAvailable ? "(coming next)" : ""}
          </option>
          <option value="unscored" disabled={!causalAvailable}>
            Causal evidence unscored {!causalAvailable ? "(coming next)" : ""}
          </option>
        </select>
      </label>

      <button
        type="submit"
        className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
      >
        Apply
      </button>

      <Link
        href="/mobile-app/programme-fidelity?attention=all"
        className="flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        Clear
      </Link>
    </>
  );
}

export function FidelityFilters(props: FidelityFilterFieldsProps) {
  const { filters } = props;
  const scope = [
    filters.schoolId ? "One school" : "All schools",
    filters.eaUserId ? "One EA" : "All EAs",
    filters.attention === "all" ? "attention first" : filters.attention,
  ].join(" · ");

  return (
    <>
      <form
        data-testid="programme-fidelity-filters-desktop"
        action="/mobile-app/programme-fidelity"
        method="get"
        className="hidden gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_auto_auto] lg:items-end"
      >
        <FidelityFilterFields {...props} />
      </form>

      <details data-testid="programme-fidelity-filters-mobile" className="group rounded-xl border border-slate-200 bg-white shadow-sm lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Filter queue
          </span>
          <span className="text-right text-[10px] text-slate-500">{scope}</span>
        </summary>
        <form
          action="/mobile-app/programme-fidelity"
          method="get"
          className="grid gap-3 border-t border-slate-100 p-4"
        >
          <FidelityFilterFields {...props} />
        </form>
      </details>
    </>
  );
}
