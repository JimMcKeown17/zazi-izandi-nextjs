"use client";

import { useEffect, useRef, useState } from "react";

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
  const [result, setResult] = useState<PasswordJourneyResult | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const clearUrl = () =>
      window.history.replaceState(null, "", window.location.pathname);
    const bootstrap = bootstrapPasswordJourney({
      search: window.location.search,
      clearUrl,
      createJourney: () => {
        const client = createPasswordSupabaseClient({
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        });
        return createPasswordJourney({
          auth: {
            getSession: () => client.auth.getSession(),
            updateUser: (attributes) => client.auth.updateUser(attributes),
            signOut: (options) => client.auth.signOut(options),
            onAuthStateChange(listener) {
              const { data } = client.auth.onAuthStateChange((event, session) => {
                listener(
                  event,
                  session ? { access_token: session.access_token } : null
                );
              });
              return () => data.subscription.unsubscribe();
            },
          },
          clearUrl,
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
      void bootstrap.journey.capture(bootstrap.operationCandidate).then((nextResult) => {
        if (!cancelled) setResult(nextResult);
      });
    } else {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setResult(bootstrap.result);
        }
      });
    }
    return () => {
      cancelled = true;
      journeyRef.current = null;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!journeyRef.current || submitting) return;
    setSubmitting(true);
    const nextResult = await journeyRef.current.submit(password, confirmation);
    setPassword("");
    setConfirmation("");
    setResult(nextResult);
    setSubmitting(false);
  }

  const canSubmit = result?.kind === "ready" || result?.kind === "recoverable_error";
  const isSuccess = result?.kind === "success";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm font-semibold text-primary">Zazi iZandi</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Set your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Choose a password for the Zazi iZandi mobile app. This page does not
          retain your password in its own browser storage; your browser or
          device may apply its own password-manager settings.
        </p>

        <p
          className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700"
          aria-live="polite"
        >
          {result ? resultMessage(result) : "Checking your secure password link…"}
        </p>

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

        {isSuccess ? (
          <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Return to the Zazi iZandi mobile app and sign in with your new
            password.
          </p>
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
