import { z } from "zod";

const profileUserIdSchema = z.string().uuid();

export function validateProfileUserId(rawId: string): string | null {
  const canonicalId = rawId.toLowerCase();
  return profileUserIdSchema.safeParse(canonicalId).success
    ? canonicalId
    : null;
}

export function buildUserProfileRequest(
  clerkSessionToken: string,
  userId: string
): { path: string; init: RequestInit } {
  if (!clerkSessionToken) throw new Error("A Clerk session token is required");

  const validatedUserId = validateProfileUserId(userId);
  if (validatedUserId === null) {
    throw new RangeError("userId must be a valid UUID");
  }

  return {
    path: `/api/mobile/users/${validatedUserId}/`,
    init: {
      cache: "no-store",
      headers: { Authorization: `Bearer ${clerkSessionToken}` },
    },
  };
}
