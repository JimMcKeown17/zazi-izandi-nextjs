"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { canSendNotifications } from "@/lib/pm/notification-roles";
import {
  invalidateNotificationTokensForUser,
  previewNotification,
  retractNotification,
  sendNotification,
  type NotificationAudienceType,
  type NotificationPayload,
} from "@/lib/pm/notifications";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireNotificationActor() {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (!userId || !canSendNotifications(role)) {
    throw new Error("You do not have permission to send notifications.");
  }

  const user = await currentUser();
  return {
    clerkUserId: userId,
    email: user?.primaryEmailAddress?.emailAddress ?? "",
  };
}

function payloadFromFormData(formData: FormData): NotificationPayload {
  const audienceType = formData.get("audience_type") as NotificationAudienceType | null;
  const audienceRef = String(formData.get("audience_ref") || "").trim();
  const expiresAt = String(formData.get("expires_at") || "").trim();

  if (!audienceType || !["all_eas", "school", "user"].includes(audienceType)) {
    throw new Error("Choose a valid audience.");
  }

  return {
    audience_type: audienceType,
    audience_ref: audienceType === "all_eas" ? null : audienceRef || null,
    title: String(formData.get("title") || "").trim(),
    body: String(formData.get("body") || "").trim(),
    send_push: formData.get("send_push") === "on",
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    is_test: formData.get("is_test") === "on",
  };
}

async function runAction<T>(task: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Notification action failed.",
    };
  }
}

export async function previewNotificationAction(formData: FormData) {
  return runAction(async () => {
    const actor = await requireNotificationActor();
    return previewNotification(payloadFromFormData(formData), actor);
  });
}

export async function sendNotificationAction(formData: FormData) {
  return runAction(async () => {
    const actor = await requireNotificationActor();
    const idempotencyKey = String(formData.get("idempotency_key") || "").trim();
    if (!idempotencyKey) {
      throw new Error("Idempotency key is missing. Reload the form and try again.");
    }
    return sendNotification(payloadFromFormData(formData), actor, idempotencyKey);
  });
}

export async function retractNotificationAction(formData: FormData) {
  return runAction(async () => {
    const actor = await requireNotificationActor();
    const eventId = String(formData.get("event_id") || "").trim();
    const reason = String(formData.get("reason") || "admin_action").trim();
    if (!eventId) throw new Error("Event id is required.");
    return retractNotification(eventId, reason, actor);
  });
}

export async function invalidateTokensForUserAction(formData: FormData) {
  return runAction(async () => {
    const actor = await requireNotificationActor();
    const userId = String(formData.get("user_id") || "").trim();
    const reason = String(formData.get("reason") || "admin_action").trim();
    if (!userId) throw new Error("EA user id is required.");
    return invalidateNotificationTokensForUser(userId, reason, actor);
  });
}
