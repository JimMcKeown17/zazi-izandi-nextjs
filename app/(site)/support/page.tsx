import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Mail, ShieldCheck } from "lucide-react";

import {
  InformationSection,
  PublicInformationPage,
} from "@/components/layout/public-information-page";

const LAST_UPDATED = "24 July 2026";

export const metadata: Metadata = {
  title: "App Support | Zazi iZandi",
  description:
    "Help with sign-in, synchronisation, location, notifications, assessments, groups, and privacy in the Zazi iZandi app.",
  alternates: {
    canonical: "https://www.zazi-izandi.co.za/support",
  },
};

const contents = [
  { href: "#contact", label: "Contact support" },
  { href: "#sign-in", label: "Sign-in help" },
  { href: "#sync", label: "Work has not uploaded" },
  { href: "#offline", label: "Offline use" },
  { href: "#location", label: "Clock-in and location" },
  { href: "#notifications", label: "Notifications" },
  { href: "#records", label: "Assessment or group issue" },
  { href: "#device", label: "Changing account or device" },
  { href: "#privacy", label: "Privacy and safety" },
];

export default function SupportPage() {
  return (
    <PublicInformationPage
      eyebrow="Mobile app"
      title="App Support"
      summary="Practical help for Education Assistants and programme staff using Zazi iZandi, including what to do before changing accounts, devices, or locally stored data."
      lastUpdated={LAST_UPDATED}
      contents={contents}
    >
      <InformationSection id="contact" title="Contact support">
        <div className="rounded-xl border border-primary/20 bg-primary-50 p-5">
          <div className="flex items-start gap-3">
            <Mail
              className="mt-1 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <p className="font-bold text-slate-950">Email app support</p>
              <a href="mailto:zama@masinyusane.org">
                zama@masinyusane.org
              </a>
            </div>
          </div>
        </div>
        <p>Include:</p>
        <ul>
          <li>your name and assigned school;</li>
          <li>
            the app version and build number shown under{" "}
            <strong>Profile &gt; App Release</strong>;
          </li>
          <li>whether you use iPhone or Android;</li>
          <li>what you expected and what happened;</li>
          <li>the approximate date and time of the problem; and</li>
          <li>whether the phone was online or offline.</li>
        </ul>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-1 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <p className="text-amber-950">
              <strong>Do not send your password.</strong> Do not include learner
              names, screenshots containing learner information, location
              coordinates, or a database export in the first message.
            </p>
          </div>
        </div>
      </InformationSection>

      <InformationSection id="sign-in" title="I cannot sign in">
        <ol>
          <li>
            Check that the phone has a working internet connection. Sign-in
            requires a connection even though the app supports offline work
            after sign-in.
          </li>
          <li>
            Confirm that you are using the email address assigned by the
            programme.
          </li>
          <li>Use <strong>Forgot password</strong> if needed.</li>
          <li>
            If the account has not been created, is disabled, or belongs to
            another staff member, contact your programme administrator or app
            support.
          </li>
        </ol>
        <p>
          Accounts are created by programme administrators. There is no public
          account registration inside the app.
        </p>
      </InformationSection>

      <InformationSection id="sync" title="My work has not uploaded">
        <ol>
          <li>Keep the app open with a stable internet connection.</li>
          <li>
            Check the sync indicator and use the app&apos;s manual sync action.
          </li>
          <li>
            Do not sign out, uninstall the app, clear app storage, reset the
            phone, or give the phone to another user while work is pending.
          </li>
          <li>
            If the error continues, write down the exact message and contact
            support.
          </li>
        </ol>
        <p>
          Records visible on the phone can still be waiting to upload. A
          successful upload also does not prove that a separate phone has
          downloaded the full history.
        </p>
      </InformationSection>

      <InformationSection id="offline" title="The app says I am offline">
        <p>
          Core teaching and assessment work is designed to remain available
          without reliable connectivity. Some actions still need internet,
          including first sign-in, password reset, new programme messages, and
          synchronisation.
        </p>
        <p>
          Reconnect when possible and allow pending work to upload before
          changing accounts or devices.
        </p>
      </InformationSection>

      <InformationSection id="location" title="Clock-in or location is not working">
        <p>
          Zazi iZandi requests foreground location when you clock in or clock
          out to support work-site time verification. Check that:
        </p>
        <ul>
          <li>Location Services are enabled on the phone;</li>
          <li>
            Zazi iZandi has location permission while the app is in use;
          </li>
          <li>the phone has had time to obtain a GPS fix; and</li>
          <li>
            battery-saving or device-management settings are not blocking
            location.
          </li>
        </ul>
        <p>
          The app does not intentionally track continuous background location.
          If a record is wrong, contact your programme manager or support
          instead of creating a misleading replacement.
        </p>
      </InformationSection>

      <InformationSection
        id="notifications"
        title="I am not receiving phone notifications"
      >
        <p>
          Programme messages can still appear inside the app when phone
          notifications are disabled.
        </p>
        <ol>
          <li>
            Open <strong>Profile</strong> in Zazi iZandi and choose the
            notification option.
          </li>
          <li>
            If permission was previously denied, open the phone&apos;s system
            settings for Zazi iZandi and enable notifications.
          </li>
          <li>
            Confirm that the phone has a connection and is not suppressing the
            app through battery-saving settings.
          </li>
        </ol>
        <p>Push notifications are not an emergency communication channel.</p>
      </InformationSection>

      <InformationSection id="records" title="An assessment or group looks wrong">
        <p>Do not overwrite a record only to make the screen look correct.</p>
        <p>Record:</p>
        <ul>
          <li>the affected class or a synthetic reference identifier;</li>
          <li>the approximate time;</li>
          <li>the action taken immediately before the problem;</li>
          <li>whether the phone was offline; and</li>
          <li>the app version and build number.</li>
        </ul>
        <p>
          Avoid learner names in ordinary email. Support will provide an
          approved secure path if more detail or a diagnostic export is needed.
        </p>
      </InformationSection>

      <InformationSection id="device" title="Changing school, account, or device">
        <p>Contact support before:</p>
        <ul>
          <li>changing the school assigned to an account;</li>
          <li>giving a shared phone to a different staff member;</li>
          <li>uninstalling the app or clearing app storage; or</li>
          <li>moving unfinished work to another phone.</li>
        </ul>
        <p>These actions can affect locally stored offline records.</p>
      </InformationSection>

      <InformationSection id="privacy" title="Privacy, security, and data requests">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-1 h-5 w-5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <p className="text-emerald-950">
              For a lost device, suspected account compromise, or possible data
              exposure, report the issue promptly to your programme manager and
              app support.
            </p>
          </div>
        </div>
        <p>
          The <Link href="/privacy">Zazi iZandi Privacy Notice</Link> explains
          what information the app processes and how to request access,
          correction, objection, or deletion. Privacy requests can be sent to{" "}
          <a href="mailto:zama@masinyusane.org">zama@masinyusane.org</a>.
        </p>
        <p>
          The rules for authorised app use are in the{" "}
          <Link href="/terms">Zazi iZandi App Terms of Use</Link>.
        </p>
      </InformationSection>
    </PublicInformationPage>
  );
}
