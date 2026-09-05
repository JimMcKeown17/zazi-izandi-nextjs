import { redirect } from "next/navigation";

import { FidelityPageContent } from "@/components/mobile-app/programme-fidelity/fidelity-page-content";
import { requireMobileSessionsSession } from "@/lib/mobile/auth";
import { parseProgrammeFidelityPageQuery } from "@/lib/mobile/programme-fidelity/request";
import {
  fetchProgrammeFidelitySessionsWithToken,
  fetchProgrammeFidelityWithToken,
} from "@/lib/mobile/programme-fidelity/server-fetch";

interface ProgrammeFidelityPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProgrammeFidelityPage({
  searchParams,
}: ProgrammeFidelityPageProps) {
  const [params, session] = await Promise.all([
    searchParams,
    requireMobileSessionsSession(),
  ]);
  const token = await session.getToken();
  if (!token) redirect("/login?error=session_expired");

  const { filters, expansion } = parseProgrammeFidelityPageQuery(params);
  const [result, sessionsResult] = await Promise.all([
    fetchProgrammeFidelityWithToken(token, filters),
    expansion
      ? fetchProgrammeFidelitySessionsWithToken(token, expansion)
      : Promise.resolve(null),
  ]);

  if (!result.ok && result.kind === "not_authenticated") {
    redirect("/login?error=session_expired");
  }
  if (!result.ok && result.kind === "not_authorized") {
    redirect("/login?error=insufficient_role");
  }
  if (sessionsResult && !sessionsResult.ok) {
    if (sessionsResult.kind === "not_authenticated") {
      redirect("/login?error=session_expired");
    }
    if (sessionsResult.kind === "not_authorized") {
      redirect("/login?error=insufficient_role");
    }
  }

  return (
    <FidelityPageContent
      result={result}
      sessionsResult={sessionsResult}
      filters={filters}
      expansion={expansion}
    />
  );
}
