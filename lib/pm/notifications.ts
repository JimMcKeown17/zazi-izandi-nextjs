import { djangoFetch, djangoPost } from "@/lib/django-fetch";

export type NotificationAudienceType = "all_eas" | "school" | "user";

export interface NotificationSchoolAudience {
  id: string;
  name: string;
}

export interface NotificationEaAudience {
  user_id: string;
  display_name: string;
  school_id: string | null;
  school_name: string | null;
}

export interface NotificationAudiences {
  schools: NotificationSchoolAudience[];
  eas: NotificationEaAudience[];
}

export interface NotificationPreviewResult {
  audience_type: NotificationAudienceType;
  audience_ref: string | null;
  recipient_count: number;
  push_title: string;
  push_body: string;
}

export interface NotificationSendResult {
  event_id: string;
  idempotent_replay: boolean;
  recipient_count: number;
  inbox_item_count: number;
  push_attempt_count: number;
  push_failed_count: number;
}

export interface NotificationPayload {
  audience_type: NotificationAudienceType;
  audience_ref: string | null;
  title: string;
  body: string;
  send_push: boolean;
  expires_at: string | null;
  is_test: boolean;
}

export interface PMAuditHeaders {
  clerkUserId: string;
  email?: string;
}

async function readDjangoJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Django request failed with ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

function auditHeaders(audit: PMAuditHeaders, idempotencyKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    "X-PM-Clerk-User-Id": audit.clerkUserId,
  };
  if (audit.email) headers["X-PM-Email"] = audit.email;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return headers;
}

export async function getNotificationAudiences(): Promise<NotificationAudiences> {
  const response = await djangoFetch("/api/mobile-notifications/pm/audiences/", {
    cache: "no-store",
  });
  return readDjangoJson<NotificationAudiences>(response);
}

export async function previewNotification(
  payload: NotificationPayload,
  audit: PMAuditHeaders
): Promise<NotificationPreviewResult> {
  const response = await djangoPost(
    "/api/mobile-notifications/pm/preview/",
    payload,
    { headers: auditHeaders(audit) }
  );
  return readDjangoJson<NotificationPreviewResult>(response);
}

export async function sendNotification(
  payload: NotificationPayload,
  audit: PMAuditHeaders,
  idempotencyKey: string
): Promise<NotificationSendResult> {
  const response = await djangoPost(
    "/api/mobile-notifications/pm/send/",
    payload,
    { headers: auditHeaders(audit, idempotencyKey) }
  );
  return readDjangoJson<NotificationSendResult>(response);
}

export async function retractNotification(
  eventId: string,
  reason: string,
  audit: PMAuditHeaders
): Promise<{ event_id: string; retracted: boolean; inbox_item_count: number }> {
  const response = await djangoPost(
    "/api/mobile-notifications/pm/retract/",
    { event_id: eventId, reason },
    { headers: auditHeaders(audit) }
  );
  return readDjangoJson(response);
}

export async function invalidateNotificationTokensForUser(
  userId: string,
  reason: string,
  audit: PMAuditHeaders
): Promise<{ user_id: string; invalidated_count: number }> {
  const response = await djangoPost(
    "/api/mobile-notifications/tokens/invalidate-for-user/",
    { user_id: userId, reason },
    { headers: auditHeaders(audit) }
  );
  return readDjangoJson(response);
}
