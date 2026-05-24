"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Bell, RotateCcw, ShieldAlert, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type NotificationAudiences,
  type NotificationAudienceType,
  type NotificationPreviewResult,
  type NotificationSendResult,
} from "@/lib/pm/notifications";
import {
  invalidateTokensForUserAction,
  previewNotificationAction,
  retractNotificationAction,
  sendNotificationAction,
} from "./actions";

interface NotificationsClientProps {
  audiences: NotificationAudiences;
}

type ActionStatus =
  | { type: "idle"; message: "" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const initialStatus: ActionStatus = { type: "idle", message: "" };

export function NotificationsClient({ audiences }: NotificationsClientProps) {
  const [audienceType, setAudienceType] = useState<NotificationAudienceType>("all_eas");
  const [audienceRef, setAudienceRef] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isTest, setIsTest] = useState(true);
  const [sendPush, setSendPush] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [preview, setPreview] = useState<NotificationPreviewResult | null>(null);
  const [sendResult, setSendResult] = useState<NotificationSendResult | null>(null);
  const [status, setStatus] = useState<ActionStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();

  const schools = audiences.schools;
  const eas = audiences.eas;
  const selectedAudienceLabel = useMemo(() => {
    if (audienceType === "all_eas") return "All active EAs";
    if (audienceType === "school") {
      return schools.find((school) => school.id === audienceRef)?.name || "Selected school";
    }
    return eas.find((ea) => ea.user_id === audienceRef)?.display_name || "Selected EA";
  }, [audienceRef, audienceType, eas, schools]);

  function resetComposeSession() {
    setIdempotencyKey(crypto.randomUUID());
    setPreview(null);
    setSendResult(null);
  }

  function buildFormData() {
    const formData = new FormData();
    formData.set("audience_type", audienceType);
    formData.set("audience_ref", audienceType === "all_eas" ? "" : audienceRef);
    formData.set("title", title);
    formData.set("body", body);
    formData.set("expires_at", expiresAt);
    formData.set("idempotency_key", idempotencyKey);
    if (isTest) formData.set("is_test", "on");
    if (sendPush) formData.set("send_push", "on");
    return formData;
  }

  function handlePreview() {
    setStatus(initialStatus);
    startTransition(async () => {
      const result = await previewNotificationAction(buildFormData());
      if (!result.ok) {
        setPreview(null);
        setStatus({ type: "error", message: result.error });
        return;
      }
      setPreview(result.data);
      setStatus({
        type: "success",
        message: `Preview resolved ${result.data.recipient_count} recipient${
          result.data.recipient_count === 1 ? "" : "s"
        }.`,
      });
    });
  }

  function handleSend() {
    if (!preview) {
      setStatus({ type: "error", message: "Preview the audience before sending." });
      return;
    }

    const confirmed = window.confirm(
      `Send this message to ${preview.recipient_count} recipient${
        preview.recipient_count === 1 ? "" : "s"
      }?`
    );
    if (!confirmed) return;

    setStatus(initialStatus);
    startTransition(async () => {
      const result = await sendNotificationAction(buildFormData());
      if (!result.ok) {
        setStatus({ type: "error", message: result.error });
        return;
      }
      setSendResult(result.data);
      setStatus({
        type: "success",
        message: `Sent event ${result.data.event_id}.`,
      });
      setIdempotencyKey(crypto.randomUUID());
    });
  }

  function handleRetract(formData: FormData) {
    setStatus(initialStatus);
    startTransition(async () => {
      const result = await retractNotificationAction(formData);
      setStatus(
        result.ok
          ? {
              type: "success",
              message: `Retracted ${result.data.inbox_item_count} inbox item${
                result.data.inbox_item_count === 1 ? "" : "s"
              }.`,
            }
          : { type: "error", message: result.error }
      );
    });
  }

  function handleInvalidate(formData: FormData) {
    setStatus(initialStatus);
    startTransition(async () => {
      const result = await invalidateTokensForUserAction(formData);
      setStatus(
        result.ok
          ? {
              type: "success",
              message: `Invalidated ${result.data.invalidated_count} active token${
                result.data.invalidated_count === 1 ? "" : "s"
              }.`,
            }
          : { type: "error", message: result.error }
      );
    });
  }

  return (
    <div className="space-y-4">
      {status.type !== "idle" && (
        <div
          className={
            status.type === "error"
              ? "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              : "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          }
        >
          {status.message}
        </div>
      )}

      <section className="rounded-md border bg-white p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Compose message</h2>
            <p className="text-sm text-slate-500">
              In-app message detail stays in Supabase; phone notification copy stays generic.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={resetComposeSession}>
            <RotateCcw className="h-4 w-4" />
            New draft
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Audience
              </legend>
              <div className="grid grid-cols-3 overflow-hidden rounded-md border">
                {[
                  ["all_eas", "All EAs"],
                  ["school", "School"],
                  ["user", "One EA"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAudienceType(value as NotificationAudienceType);
                      setAudienceRef("");
                      setPreview(null);
                    }}
                    className={
                      audienceType === value
                        ? "bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                        : "border-l first:border-l-0 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {audienceType === "school" && (
              <label className="block text-sm font-medium text-slate-700">
                School
                <select
                  value={audienceRef}
                  onChange={(event) => {
                    setAudienceRef(event.target.value);
                    setPreview(null);
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Choose a school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {audienceType === "user" && (
              <label className="block text-sm font-medium text-slate-700">
                Education Assistant
                <select
                  value={audienceRef}
                  onChange={(event) => {
                    setAudienceRef(event.target.value);
                    setPreview(null);
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Choose an EA</option>
                  {eas.map((ea) => (
                    <option key={ea.user_id} value={ea.user_id}>
                      {ea.display_name}
                      {ea.school_name ? ` — ${ea.school_name}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Title
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setPreview(null);
                }}
                maxLength={80}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Body
              <textarea
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                  setPreview(null);
                }}
                maxLength={1000}
                rows={6}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Expires
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => {
                    setExpiresAt(event.target.value);
                    setPreview(null);
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="space-y-2 pt-6">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={isTest}
                    onChange={(event) => {
                      setIsTest(event.target.checked);
                      if (!event.target.checked) setSendPush(false);
                      setPreview(null);
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Test mode
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={sendPush}
                    disabled={!isTest}
                    onChange={(event) => {
                      setSendPush(event.target.checked);
                      setPreview(null);
                    }}
                    className="h-4 w-4 rounded border-slate-300 disabled:opacity-50"
                  />
                  Also send phone notification
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handlePreview} disabled={isPending}>
                Preview audience
              </Button>
              <Button type="button" onClick={handleSend} disabled={isPending}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                In-app preview
              </div>
              <div className="rounded-md border bg-white p-3">
                <div className="text-sm font-semibold text-slate-900">
                  {title || "Message title"}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                  {body || "Message body"}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Bell className="h-3.5 w-3.5" />
                Phone preview
              </div>
              <div className="rounded-md border bg-white p-3">
                <div className="text-sm font-semibold text-slate-900">
                  New Zazi iZandi message
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Open the app to read the update.
                </p>
              </div>
            </div>

            <dl className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Audience</dt>
                <dd className="text-right font-medium text-slate-900">
                  {selectedAudienceLabel}
                </dd>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <dt className="text-slate-500">Recipients</dt>
                <dd className="font-medium text-slate-900">
                  {preview ? preview.recipient_count : "Preview required"}
                </dd>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <dt className="text-slate-500">Mode</dt>
                <dd className="font-medium text-slate-900">
                  {isTest ? "Test" : "Live"}
                </dd>
              </div>
            </dl>

            {sendResult && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <div className="font-semibold">Last send</div>
                <div className="mt-1 break-all">Event: {sendResult.event_id}</div>
                <div className="mt-1">
                  Push attempts: {sendResult.push_attempt_count}, failed:{" "}
                  {sendResult.push_failed_count}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form action={handleRetract} className="rounded-md border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Retract message</h2>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Event ID
            <input
              name="event_id"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <input type="hidden" name="reason" value="admin_action" />
          <Button type="submit" variant="outline" className="mt-3" disabled={isPending}>
            Retract
          </Button>
        </form>

        <form action={handleInvalidate} className="rounded-md border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h2 className="text-base font-semibold text-slate-900">Lost or replaced phone</h2>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            EA auth user ID
            <input
              name="user_id"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Reason
            <select
              name="reason"
              defaultValue="lost_stolen"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="lost_stolen">Lost or stolen</option>
              <option value="replaced_phone">Replaced phone</option>
              <option value="admin_action">Admin action</option>
            </select>
          </label>
          <Button type="submit" variant="outline" className="mt-3" disabled={isPending}>
            Invalidate active tokens
          </Button>
        </form>
      </section>
    </div>
  );
}
