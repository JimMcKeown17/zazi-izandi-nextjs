import {
  ATTENTION_LABELS,
  BLOCKER_PLAYBOOK,
  type UserAttentionReason,
} from "@/lib/mobile/user-health/presentation";

const ATTENTION_REASONS = Object.keys(
  ATTENTION_LABELS
) as UserAttentionReason[];

export function HowToReadPanel({
  lifetimeEvidence,
  days = 30,
}: {
  lifetimeEvidence: boolean;
  days?: number;
}) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
        How to read this evidence
      </summary>
      <div className="border-t border-slate-100 px-4 py-4">
        <div className="grid gap-4 text-sm leading-relaxed text-slate-600 lg:grid-cols-2">
          <p>
            <strong className="text-slate-800">Population.</strong> Banned
            accounts and known synthetic accounts, including <code>+blank</code>,{" "}
            <code>+groups</code>, <code>+full</code>, and <code>+fakedata</code>{" "}
            addresses plus named staff-test identities, are excluded from both
            the EA rows and all summary totals.
          </p>
          {lifetimeEvidence ? (
            <p>
              <strong className="text-slate-800">Device signals.</strong>{" "}
              Download/install is not directly observable. A registered push
              device is positive app evidence, but no token can also mean
              notification permission was denied. Treat “no device signal” as
              unknown—not “not installed.” Reached includes devices whose push
              token later died because the lifetime stage does not regress.
            </p>
          ) : (
            <p>
              <strong className="text-slate-800">Device signals.</strong>{" "}
              Download/install is not directly observable. A registered push
              device is positive app evidence, but no token can also mean
              notification permission was denied. Treat “no device signal” as
              unknown—not “not installed.” A signal can disappear when a device is
              lost or replaced—the stage tracks current evidence, not history.
            </p>
          )}
          <p>
            <strong className="text-slate-800">
              Auth history &amp; provisioning.
            </strong>{" "}
            “Authenticated after provisioning” is a rollout proxy. Primary
            accounts are compared with the 08 Aug 2026, 04:59 SAST credential
            release; the ECD account batch is compared with 11 Aug 2026, 21:30
            SAST after its CSV completed. A later Auth event proves successful
            authentication after rollout, but it does not identify the mobile
            app, platform, or device as the client. If no trusted rollout cutoff
            applies, post-provisioning authentication is unmeasured.
          </p>
          <p>
            <strong className="text-slate-800">Setup mode.</strong> Seeded EAs
            need the expected class, children, groups, and memberships. Self-setup
            EAs are not flagged merely because that imported seed bundle is absent.
            The mode is an explicit rollout decision, not an inference from school
            type or later activity; correct the mode when the operational plan was
            recorded incorrectly.
          </p>
          {lifetimeEvidence ? (
            <p>
              <strong className="text-slate-800">
                Stages and windowing.
              </strong>{" "}
              Activated means the EA has ever produced app activity. It can
              never go backwards, and shrinking the window cannot demote them.
              Reached includes accounts whose only proof is a signed-in app open.
              Windowed claims live in separate indicators: Active · {days}d
              means usage in the selected window, while Quiet · {days}d means
              activated-ever but silent in that window. The Active filter and
              tile are windowed and count the same users; the stage badge is
              lifetime. They answer different questions.
            </p>
          ) : (
            <p>
              <strong className="text-slate-800">Windowing.</strong>{" "}
              {"Activity numbers and 'last activity' cover only the selected window — changing the window changes them."}
            </p>
          )}
          <p>
            <strong className="text-slate-800">School filter.</strong>{" "}
            {"With no school selected, every real Auth account is listed, including EAs not yet on a roster; selecting a school narrows to rostered EAs, so totals are not comparable across that toggle."}
          </p>
          {lifetimeEvidence ? (
            <p>
              <strong className="text-slate-800">Wave scope.</strong> The wave
              filter scopes both the board and the evidence strip to one rollout
              wave. “Day n” counts whole days since launch in SAST. “No wave”
              shows accounts not assigned to any wave.
            </p>
          ) : null}
          {lifetimeEvidence ? (
            <p>
              <strong className="text-slate-800">Opened evidence.</strong>{" "}
              {`An "Opened" date is proof the app was opened by this signed-in account — it says the app reached them, not that they are teaching with it or still using it. Older app versions don't send it, so missing Opened evidence is not proof of absence.`}
            </p>
          ) : null}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h2 className="text-sm font-bold text-slate-900">Blocker playbook</h2>
          <dl className="mt-3 divide-y divide-slate-100">
            {ATTENTION_REASONS.map((reason) => (
              <div
                key={reason}
                className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4"
              >
                <dt className="text-xs font-semibold text-red-700">
                  {ATTENTION_LABELS[reason]}
                </dt>
                <dd className="text-sm leading-relaxed text-slate-600">
                  {BLOCKER_PLAYBOOK[reason]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </details>
  );
}
