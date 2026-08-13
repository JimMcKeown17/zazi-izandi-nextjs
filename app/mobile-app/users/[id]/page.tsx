import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { ClockHistoryTable } from "@/components/mobile-app/user-profile/clock-history-table";
import { EvidencePanel } from "@/components/mobile-app/user-profile/evidence-panel";
import { LifetimeSummary } from "@/components/mobile-app/user-profile/lifetime-summary";
import { ProfileDataQuality } from "@/components/mobile-app/user-profile/profile-data-quality";
import { ProfileHeader } from "@/components/mobile-app/user-profile/profile-header";
import { ProfileHowToPanel } from "@/components/mobile-app/user-profile/profile-how-to-panel";
import { ProfileNotFound } from "@/components/mobile-app/user-profile/profile-not-found";
import { RecentSessionsTable } from "@/components/mobile-app/user-profile/recent-sessions-table";
import { WeekdaySessionStrip } from "@/components/mobile-app/user-profile/weekday-session-strip";
import { ProfileWeeklyTrends } from "@/components/mobile-app/user-profile/weekly-bar-chart";
import { getMobileUserProfile } from "@/lib/mobile/api";

interface MobileUserProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function MobileUserProfilePage({
  params,
}: MobileUserProfilePageProps) {
  const { id } = await params;
  const result = await getMobileUserProfile(id);

  if (!result.ok && "notFound" in result) {
    return <ProfileNotFound />;
  }

  if (!result.ok && "dataQuality" in result) {
    return <ProfileDataQuality />;
  }

  if (!result.ok) {
    return (
      <div
        data-testid="mobile-user-profile-error"
        className="mx-auto max-w-4xl space-y-4"
      >
        <Link
          href="/mobile-app/users"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">User profile unavailable</p>
            <p className="mt-1">{result.message}</p>
            <p className="mt-2 text-xs text-red-600">Status {result.status}</p>
          </div>
        </div>
      </div>
    );
  }

  const profile = result.data;

  return (
    <div
      data-testid="mobile-user-profile-success"
      className="mx-auto max-w-[96rem] space-y-4"
    >
      <Link
        href="/mobile-app/users"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      <ProfileHeader profile={profile} />
      <EvidencePanel profile={profile} />
      <LifetimeSummary totals={profile.lifetime.totals} />
      <ProfileWeeklyTrends series={profile.weekly} />
      <WeekdaySessionStrip
        dates={profile.recent_weekday_sessions.dates}
        cells={profile.recent_weekday_sessions.cells}
      />
      <RecentSessionsTable sessions={profile.recent_sessions} />
      <ClockHistoryTable entries={profile.clock_entries} />
      <ProfileHowToPanel days={profile.days} />
    </div>
  );
}
