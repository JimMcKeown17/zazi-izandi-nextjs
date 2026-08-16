import { MobileReassignRosterFlow, type MobileReassignEaOption } from "@/components/mobile-app/reassign/reassign-roster-flow";
import { getMobileUserHealth } from "@/lib/mobile/api";
import { requireMobileReassignSession } from "@/lib/mobile/auth";

export default async function MobileReassignRosterPage() {
  await requireMobileReassignSession();
  const result = await getMobileUserHealth({ days: 30, schoolId: null });
  const candidates: MobileReassignEaOption[] = result.ok
    ? result.data.users.map((user) => ({
        userId: user.user_id,
        displayName: user.display_name,
        school: user.current_school,
        employmentStatus: user.employment_status,
      }))
    : [];

  return <MobileReassignRosterFlow candidates={candidates} />;
}
