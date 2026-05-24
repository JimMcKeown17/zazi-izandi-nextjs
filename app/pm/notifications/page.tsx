import { auth } from "@clerk/nextjs/server";
import { AlertTriangle, BellOff } from "lucide-react";
import { NotificationsClient } from "./notifications-client";
import { canSendNotifications } from "@/lib/pm/notification-roles";
import {
  getNotificationAudiences,
  type NotificationAudiences,
} from "@/lib/pm/notifications";

const emptyAudiences: NotificationAudiences = {
  schools: [],
  eas: [],
};

export default async function PMNotificationsPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (!canSendNotifications(role)) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-md border bg-white p-6">
          <div className="flex items-start gap-3">
            <BellOff className="mt-0.5 h-5 w-5 text-slate-500" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Your PM role can view dashboards, but cannot author mobile notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let audiences = emptyAudiences;
  let audienceError = "";
  try {
    audiences = await getNotificationAudiences();
  } catch (error) {
    audienceError =
      error instanceof Error ? error.message : "Notification audience API is unavailable.";
    console.error("[pm/notifications] Unable to load notification audiences", error);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {audienceError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <span className="font-semibold">Notification API unavailable.</span>{" "}
              Start the Django backend configured by <code>DJANGO_API_URL</code>, then
              refresh this page. The form is shown with empty audience lists until the
              API is reachable.
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500">
          Send durable in-app messages and optional phone alerts to active EAs.
        </p>
      </div>
      <NotificationsClient audiences={audiences} />
    </div>
  );
}
