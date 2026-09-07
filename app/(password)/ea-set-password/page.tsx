"use client";

import { useEffect, useRef, useState } from "react";
import { captureProofLink, createProofJourney } from "@/lib/ea-set-password/proof-journey";

import { createPasswordSupabaseClient } from "@/lib/ea-set-password/browser-supabase";
import { bootstrapPasswordJourney } from "@/lib/ea-set-password/bootstrap";
import {
  SAFE_MESSAGES,
  type PasswordJourneyResult,
} from "@/lib/ea-set-password/contract";
import {
  createPasswordJourney,
  type PasswordJourney,
} from "@/lib/ea-set-password/journey";

function isCompletedResponse(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    (value as Record<string, unknown>).kind === "completed"
  );
}

function resultMessage(result: PasswordJourneyResult): string {
  return result.kind === "ready" ? SAFE_MESSAGES.ready : result.message;
}

export default function EaSetPasswordPage() {
  const journeyRef = useRef<PasswordJourney | null>(null);
  const proofRef = useRef<ReturnType<typeof createProofJourney> | null>(null);
  const [awaitingRedemption, setAwaitingRedemption] = useState(false);
  const activeRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const [result, setResult] = useState<PasswordJourneyResult | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activeRef.current = true;
    function leaveDocument() {
      cancelled = true;
      activeRef.current = false;
      const journey = journeyRef.current;
      journeyRef.current = null;
      proofRef.current = null;
      // BFCache can preserve a document without unmounting React. Clear DOM
      // values immediately as well as scheduling the matching React state.
      document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => { input.value = ""; });
      setPassword(""); setConfirmation(""); setAwaitingRedemption(false);
      setResult({kind:"terminal_error",code:"invalid_link",message:SAFE_MESSAGES.invalidLink});
      void journey?.dispose();
    }
    function restored(event:PageTransitionEvent) { if (event.persisted) leaveDocument(); }
    window.addEventListener("pagehide",leaveDocument);
    window.addEventListener("pageshow",restored);
    // React replays effects in Strict Mode. Let the cancelled setup expire before
    // consuming the one-use URL; a real setup still scrubs before client creation.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (new URLSearchParams(window.location.hash.slice(1)).has("token_hash")) {
        const link = captureProofLink(window.location.href, () => window.history.replaceState(null, "", "/ea-set-password"));
        if (!link) { setResult({kind:"terminal_error",code:"invalid_link",message:SAFE_MESSAGES.invalidLink}); return; }
        const proof = createProofJourney(link, async (action, body, bearer) => {
          const response = await fetch(`/api/mobile/password-setup/${action}`, {
            method:"POST", cache:"no-store", credentials:"omit", referrerPolicy:"no-referrer", keepalive:action==="discard",
            headers:{"Content-Type":"application/json", ...(bearer ? {Authorization:`Bearer ${bearer}`} : {})},
            body:JSON.stringify(body),
          });
          return response.json();
        });
        proofRef.current = proof;
        journeyRef.current = {dispose:proof.dispose,submit:proof.submit,capture:async()=>({kind:"ready"})};
        setAwaitingRedemption(true);
        return;
      }
      const bootstrap = bootstrapPasswordJourney({
        href: window.location.href,
        scrubOriginalCallbackUrl: () =>
          window.history.replaceState(null, "", "/ea-set-password"),
        createJourney: () => {
          const client = createPasswordSupabaseClient({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          });
          return createPasswordJourney({
            auth: {
              setSession: (tokens) => client.auth.setSession(tokens),
              updateUser: (attributes) => client.auth.updateUser(attributes),
              signOut: (options) => client.auth.signOut(options),
            },
            completion: async ({ operationId, bearer }) => {
              try {
                const response = await fetch("/api/mobile/password-completion", {
                  method: "POST",
                  cache: "no-store",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${bearer}`,
                  },
                  body: JSON.stringify({ operation_id: operationId }),
                });
                if (!response.ok) return { ok: false };
                return { ok: isCompletedResponse(await response.json()) };
              } catch {
                return { ok: false };
              }
            },
          });
        },
      });
      if (bootstrap.journey) {
        journeyRef.current = bootstrap.journey;
        void bootstrap.journey.capture(bootstrap.callback).then((nextResult) => {
          if (!cancelled) setResult(nextResult);
        });
      } else {
        void Promise.resolve().then(() => {
          if (!cancelled) {
            setResult(bootstrap.result);
          }
        });
      }
    });
    return () => {
      window.removeEventListener("pagehide",leaveDocument);
      window.removeEventListener("pageshow",restored);
      cancelled = true;
      activeRef.current = false;
      const journey = journeyRef.current;
      journeyRef.current = null;
      void journey?.dispose();
    };
  }, []);

  async function redeemLink() {
    if (!proofRef.current || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setSubmitting(true);
    const next = await proofRef.current.redeem();
    submitInFlightRef.current = false;
    if (!activeRef.current) return;
    setAwaitingRedemption(false);
    setSubmitting(false);
    setResult(next);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!journeyRef.current || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setSubmitting(true);
    const nextResult = await journeyRef.current.submit(password, confirmation);
    submitInFlightRef.current = false;
    if (!activeRef.current) return;
    setPassword("");
    setConfirmation("");
    setResult(nextResult);
    setSubmitting(false);
  }

  const canSubmit = result?.kind === "ready" || result?.kind === "recoverable_error";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm font-semibold text-primary">Zazi iZandi</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Set your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Choose a password for the Zazi iZandi mobile app.
        </p>

        <p
          className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700"
          aria-live="polite"
        >
          {awaitingRedemption ? "Continue to securely open this password link." : result ? resultMessage(result) : "Checking your secure password link…"}
        </p>

        {awaitingRedemption ? (
          <button type="button" disabled={submitting} onClick={redeemLink} className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {submitting ? "Opening secure link…" : "Continue"}
          </button>
        ) : null}

        {canSubmit ? (
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <div>
              <label
                className="block text-sm font-medium text-slate-800"
                htmlFor="password"
              >
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-slate-800"
                htmlFor="password-confirmation"
              >
                Confirm new password
              </label>
              <input
                id="password-confirmation"
                name="password-confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving password…" : "Save password"}
            </button>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600">
          Need a new link? Use{" "}
          <span className="font-medium">Forgot Password</span> in the mobile
          app, or contact your programme manager.
        </p>
      </section>
    </main>
  );
}
