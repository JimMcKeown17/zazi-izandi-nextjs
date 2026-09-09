"use client";

import { useEffect, useRef, useState } from "react";
import {
  requestMobilePasswordReset,
  type PasswordRecoveryResult,
} from "@/app/(site)/mobile-app/users/actions";

interface Props { userId: string; displayName: string }
type Attempt = { userId: string; operationId: string };

const messages: Record<PasswordRecoveryResult["kind"], string> = {
  mail_accepted: "The mail service accepted the message. This does not confirm inbox delivery or that the EA has changed their password. Ask them to check their inbox and spam folder.",
  unconfirmed: "We could not confirm whether the message was sent. Check this request again without sending another message, or deliberately issue a replacement link.",
  refused: "The request was refused. No delivery has been confirmed. Check the account before issuing a replacement link.",
  unauthorized: "Your session could not authorize this request. Sign in again before trying to send a link.",
};

export function PasswordRecoveryPanel(props: Props) {
  // A different account gets a new attempt scope even during client navigation.
  return <AccountPasswordRecovery key={props.userId} {...props} />;
}

function AccountPasswordRecovery({ userId, displayName }: Props) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<PasswordRecoveryResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function perform(boundAttempt: Attempt) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setConfirming(false);
    try {
      const outcome = await requestMobilePasswordReset(boundAttempt);
      if (mounted.current) setResult(outcome);
    } catch {
      if (mounted.current) setResult({ kind: "unconfirmed" });
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function confirmNewAttempt() {
    if (inFlight.current) return;
    const nextAttempt = { userId, operationId: crypto.randomUUID() };
    setAttempt(nextAttempt);
    setResult(null);
    void perform(nextAttempt);
  }

  return (
    <div role="region" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby={`password-reset-${userId}`}>
      <h2 id={`password-reset-${userId}`} className="text-lg font-semibold text-slate-900">Password reset</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Send {displayName} a link to choose a new password using the email address registered to their app account.
        The EA chooses their own password.
      </p>
      {busy ? <p role="status" className="mt-4 text-sm text-slate-600">Checking the request…</p> : result ? (
        <p role="status" className={`mt-4 rounded-lg border p-3 text-sm ${result.kind === "mail_accepted" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {messages[result.kind]}
        </p>
      ) : null}
      {confirming ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Send a {attempt ? "replacement " : ""}password reset link to {displayName}?</p>
          <p className="mt-1 text-sm text-slate-600">A new request replaces earlier unused setup links. The link goes to the account’s registered email address.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={confirmNewAttempt} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {attempt ? "Send replacement link" : "Confirm and send link"}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {attempt && result?.kind !== "mail_accepted" ? (
            <button type="button" disabled={busy} onClick={() => void perform(attempt)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Check this request again</button>
          ) : null}
          <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
            {attempt ? "Prepare replacement link" : "Send password reset link"}
          </button>
        </div>
      )}
    </div>
  );
}
