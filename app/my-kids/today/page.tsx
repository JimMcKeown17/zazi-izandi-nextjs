import { auth } from "@clerk/nextjs/server";
import {
  getEaOverview,
  getTodaysBrief,
  getTodaysChatMessages,
  getUsageToday,
} from "@/lib/ea/api";
import type { EaMetadata } from "@/lib/ea/types";
import { NotLinkedState } from "@/components/my-kids/not-linked-state";
import { ZeroGroupsState } from "@/components/my-kids/zero-groups-state";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";
import { DailyBriefPanel } from "@/components/my-kids/daily-brief-panel";
import { EaChat } from "@/components/my-kids/ea-chat";

/**
 * Today tab — the new default EA landing page.
 *
 * Renders:
 *   - DailyBriefPanel on top (CTA + stream, or cached brief if generated today)
 *   - EaChat below (with today's chat history rehydrated)
 *
 * Empty states:
 *   - No Clerk metadata linking to a teampact_user_id → NotLinkedState
 *   - Django backend unavailable → BackendErrorState
 *   - EA has zero groups → ZeroGroupsState (AI features hidden entirely)
 */
export default async function MyKidsTodayPage() {
  const { sessionClaims } = await auth();
  const meta = sessionClaims?.metadata as EaMetadata | undefined;

  if (!meta?.teampact_user_id) {
    return <NotLinkedState />;
  }
  const teampactUserId = meta.teampact_user_id;

  const overview = await getEaOverview(teampactUserId);
  if (!overview.ok) {
    return <BackendErrorState />;
  }
  if (overview.data.groups.length === 0) {
    return <ZeroGroupsState />;
  }

  // Parallelise the three AI-specific reads
  const [brief, chatMessages, usage] = await Promise.all([
    getTodaysBrief(teampactUserId),
    getTodaysChatMessages(teampactUserId),
    getUsageToday(teampactUserId),
  ]);

  const briefCap = usage?.brief_cap ?? 3;
  const briefsToday = usage?.briefs_today ?? 0;
  const chatCap = usage?.chat_cap ?? 20;
  const chatMessagesToday = usage?.chat_messages_today ?? 0;

  const greeting = buildGreeting(overview.data.ea_name);

  return (
    <div className="space-y-4">
      <header className="pb-2">
        <h1 className="text-xl font-semibold text-slate-900">{greeting}</h1>
        <p className="text-sm text-slate-500">{formatToday()}</p>
      </header>

      <DailyBriefPanel
        initialBrief={brief}
        briefCap={briefCap}
        briefsToday={briefsToday}
      />

      <EaChat
        initialMessages={chatMessages}
        chatCap={chatCap}
        chatMessagesToday={chatMessagesToday}
      />
    </div>
  );
}

function buildGreeting(eaName: string): string {
  const firstName = (eaName || "").trim().split(/\s+/)[0];
  if (!firstName) return "Welcome back";
  return `Hello, ${firstName}`;
}

function formatToday(): string {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());
}
