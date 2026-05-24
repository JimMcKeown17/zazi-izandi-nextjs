import { auth } from "@clerk/nextjs/server";
import { BellOff } from "lucide-react";
import { NotificationsClient } from "./notifications-client";
import { canSendNotifications } from "@/lib/pm/notification-roles";
import { getNotificationAudiences } from "@/lib/pm/notifications";

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

  const audiences = await getNotificationAudiences();

  return (
    <div className="mx-auto max-w-6xl space-y-4">
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
