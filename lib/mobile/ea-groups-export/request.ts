interface EaGroupsExportRequest {
  path: string;
  init: RequestInit;
}

export function buildEaGroupsExportRequest(
  clerkSessionToken: string
): EaGroupsExportRequest {
  if (!clerkSessionToken) throw new Error("A Clerk session token is required");

  return {
    path: "/api/mobile/exports/ea-groups/",
    init: {
      cache: "no-store",
      headers: { Authorization: `Bearer ${clerkSessionToken}` },
    },
  };
}
