import { getEAPerformance } from "@/lib/pm/api";
import { TeacherSearch } from "@/components/pm/teacher-view/teacher-search";

export default async function TeacherViewLandingPage() {
  const { data } = await getEAPerformance("treatment");

  const searchable = data.eas
    .filter((ea) => ea.ea_user_id !== null)
    .map((ea) => ({
      ea_name: ea.ea_name,
      ea_user_id: ea.ea_user_id as number,
      school: ea.school,
      grade: `${ea.groups_count} group${ea.groups_count !== 1 ? "s" : ""}`,
      children_count: ea.children_count ?? 0,
    }))
    .sort((a, b) => a.ea_name.localeCompare(b.ea_name));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Teacher View</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick an EA/classroom to preview exactly what a teacher would see at{" "}
          <code className="font-mono text-slate-600">/my-classroom</code>.
          Useful for QA, demos, and understanding what data is being surfaced to
          teachers.
        </p>
      </div>

      <TeacherSearch eas={searchable} />
    </div>
  );
}
