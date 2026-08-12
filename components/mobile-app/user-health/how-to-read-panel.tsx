import {
  ATTENTION_LABELS,
  BLOCKER_PLAYBOOK,
  type UserAttentionReason,
} from "@/lib/mobile/user-health/presentation";

const ATTENTION_REASONS = Object.keys(
  ATTENTION_LABELS
) as UserAttentionReason[];

export function HowToReadPanel() {
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
          <p>
            <strong className="text-slate-800">Device signals.</strong>{" "}
            Download/install is not directly observable. A registered push
            device is positive app evidence, but no token can also mean
            notification permission was denied. Treat “no device signal” as
            unknown—not “not installed.” A signal can disappear when a device is
            lost or replaced—the stage tracks current evidence, not history.
          </p>
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
            <strong className="text-slate-800">Server data.</strong> “Server
            data ready” verifies stored ownership/count evidence, not a physical
            device screen. A real signed-in app browse remains the strongest
            proof that a specific EA sees the expected children and groups.
          </p>
          <p>
            <strong className="text-slate-800">Windowing.</strong>{" "}
            {"Activity numbers and 'last activity' cover only the selected window — changing the window changes them."}
          </p>
          <p>
            <strong className="text-slate-800">School filter.</strong>{" "}
            {"With no school selected, every real Auth account is listed, including EAs not yet on a roster; selecting a school narrows to rostered EAs, so totals are not comparable across that toggle."}
          </p>
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
