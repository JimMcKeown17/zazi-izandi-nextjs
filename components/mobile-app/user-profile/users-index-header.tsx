import { EaGroupsExportButton } from "./ea-groups-export-button";

const GENERATED_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  dateStyle: "medium",
  timeStyle: "short",
});

export function UsersIndexHeader({
  canExport,
  generatedAt,
}: {
  canExport: boolean;
  generatedAt: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Mobile app operations
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Users</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
          Eligible EA roster with current school, rollout wave, stage, and links
          to individual mobile reporting profiles.
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        {canExport ? <EaGroupsExportButton /> : null}
        {generatedAt ? (
          <p className="text-xs text-slate-400">
            Generated {GENERATED_FORMAT.format(new Date(generatedAt))} SAST
          </p>
        ) : null}
      </div>
    </div>
  );
}
