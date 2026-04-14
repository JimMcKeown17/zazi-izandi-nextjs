import { getEAPerformance } from "@/lib/pm/api";
import { EaSearch } from "@/components/pm/ea-mobile-view/ea-search";

export default async function EaMobileViewLandingPage() {
  const { data } = await getEAPerformance("treatment");

  // Filter to EAs with a valid ea_user_id (nav requires a real ID for routing).
  // Sort alphabetically by name for a stable, scannable list.
  const searchable = data.eas
    .filter((ea) => ea.ea_user_id !== null)
    .map((ea) => ({
      ea_name: ea.ea_name,
      ea_user_id: ea.ea_user_id as number,
      school: ea.school,
    }))
    .sort((a, b) => a.ea_name.localeCompare(b.ea_name));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          EA Mobile View
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick an EA to preview exactly what they see on their phone when
          they open <code className="font-mono text-slate-600">/my-kids</code>.
          Useful for understanding the coaching tips and messaging being
          surfaced to each EA.
        </p>
      </div>

      <EaSearch eas={searchable} />
    </div>
  );
}
