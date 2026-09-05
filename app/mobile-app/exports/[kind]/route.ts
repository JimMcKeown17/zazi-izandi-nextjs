import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { djangoFetch } from "@/lib/django-fetch";
import type { Role } from "@/lib/mobile/capabilities";
import { handleEaGroupsExport } from "@/lib/mobile/ea-groups-export/handler";
import { handleSessionExport } from "@/lib/mobile/session-exports/handler";
import {
  DETAIL_EXPORT_KIND,
  PAYROLL_EXPORT_KIND,
} from "@/lib/mobile/session-exports/transport";
import { handleTimeEntriesExport } from "@/lib/mobile/time-entries/export-handler";

export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  if (
    kind !== "time-entries" &&
    kind !== "ea-groups" &&
    kind !== PAYROLL_EXPORT_KIND &&
    kind !== DETAIL_EXPORT_KIND
  ) {
    return NextResponse.json({ error: "export not found" }, { status: 404 });
  }

  if (kind === PAYROLL_EXPORT_KIND || kind === DETAIL_EXPORT_KIND) {
    return handleSessionExport(request, kind, {
      getSession: async () => {
        const session = await auth();
        return {
          userId: session.userId,
          sessionClaims: session.sessionClaims as
            | { metadata?: { role?: Role } }
            | null
            | undefined,
          getToken: () => session.getToken(),
        };
      },
      fetchUpstream: djangoFetch,
    });
  }

  if (kind === "ea-groups") {
    return handleEaGroupsExport(request, {
      getSession: async () => {
        const session = await auth();
        return {
          userId: session.userId,
          sessionClaims: session.sessionClaims as
            | { metadata?: { role?: Role } }
            | null
            | undefined,
          getToken: () => session.getToken(),
        };
      },
      fetchUpstream: djangoFetch,
    });
  }
  return handleTimeEntriesExport(request, {
    getSession: async () => {
      const session = await auth();
      return {
        userId: session.userId,
        sessionClaims: session.sessionClaims as
          | { metadata?: { role?: Role } }
          | null
          | undefined,
        getToken: () => session.getToken(),
      };
    },
    fetchUpstream: djangoFetch,
  });
}
