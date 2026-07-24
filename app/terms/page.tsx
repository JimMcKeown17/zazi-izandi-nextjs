import type { Metadata } from "next";
import Link from "next/link";

import {
  InformationSection,
  PublicInformationPage,
} from "@/components/layout/public-information-page";

const LAST_UPDATED = "24 July 2026";

export const metadata: Metadata = {
  title: "App Terms of Use | Zazi iZandi",
  description:
    "Terms governing authorised use of the Zazi iZandi mobile app by Education Assistants and programme staff.",
  alternates: {
    canonical: "https://www.zazi-izandi.co.za/terms",
  },
};

const contents = [
  { href: "#about", label: "About these terms" },
  { href: "#access", label: "Authorised access" },
  { href: "#use", label: "Appropriate use" },
  { href: "#learner-records", label: "Learner records" },
  { href: "#professional-judgement", label: "Professional judgement" },
  { href: "#offline", label: "Offline use and sync" },
  { href: "#location", label: "Location and messages" },
  { href: "#availability", label: "Updates and availability" },
  { href: "#legal", label: "Ownership and legal terms" },
  { href: "#contact", label: "Support and contact" },
];

export default function TermsPage() {
  return (
    <PublicInformationPage
      eyebrow="Mobile app"
      title="Terms of Use"
      summary="These terms set the ground rules for safe, accurate, and authorised use of the Zazi iZandi app by Education Assistants and programme staff."
      lastUpdated={LAST_UPDATED}
      contents={contents}
    >
      <InformationSection id="about" title="1. About these terms">
        <p>
          These terms govern use of the Zazi iZandi mobile app by authorised
          Education Assistants and programme staff. The app is operated by{" "}
          <strong>Masinyusane Development Organisation</strong> (074-244-NPO)
          for the Zazi iZandi literacy programme.
        </p>
        <p>
          By signing in to or using the app, you agree to use it in accordance
          with these terms, the <Link href="/privacy">Privacy Notice</Link>,
          your programme responsibilities, and applicable staff, school,
          safeguarding, and information-security policies.
        </p>
        <p>
          If an instruction appears to conflict with your staff, school, or
          programme agreement, pause and ask your programme manager or support
          contact before changing programme data.
        </p>
      </InformationSection>

      <InformationSection id="access" title="2. Authorised access">
        <p>
          The app is for authorised adult users participating in the Zazi
          iZandi programme. Accounts are created by programme administrators.
          The app does not offer public or self-service registration.
        </p>
        <p>You must:</p>
        <ul>
          <li>use only the account assigned to you;</li>
          <li>keep your password and device secure;</li>
          <li>not share an account or allow another person to act as you;</li>
          <li>
            report promptly if a device or credential may be compromised;
          </li>
          <li>sign out before an authorised device transfer; and</li>
          <li>
            follow programme instructions for shared devices and offline
            records.
          </li>
        </ul>
        <p>
          Access may be suspended or disabled when it is no longer authorised,
          security is at risk, the programme relationship ends, or these terms
          are materially breached.
        </p>
      </InformationSection>

      <InformationSection id="use" title="3. Appropriate use">
        <p>
          You may use the app only for authorised programme work, including
          literacy sessions, attendance, assessments, teaching groups, learner
          progress, programme messages, work-site time, and approved support or
          synchronisation tasks.
        </p>
        <p>You must not:</p>
        <ul>
          <li>
            access or attempt to access records outside your authorised scope;
          </li>
          <li>
            enter false, misleading, discriminatory, or unnecessary
            information;
          </li>
          <li>
            use real learner information in demonstrations, screenshots, or
            training material without specific authorisation;
          </li>
          <li>
            export, copy, or send learner or staff data through an unapproved
            channel;
          </li>
          <li>
            disrupt the app, bypass security controls, or use it for unrelated
            surveillance, advertising, or unlawful purposes.
          </li>
        </ul>
      </InformationSection>

      <InformationSection
        id="learner-records"
        title="4. Learner records and safeguarding"
      >
        <p>
          Learner information is confidential. Record only information needed
          for the approved literacy programme and take reasonable care that
          names, assessments, attendance, session notes, and group assignments
          are accurate.
        </p>
        <p>
          Free-text notes must not contain unnecessary health, disability,
          family, disciplinary, or other sensitive details. Follow the approved
          safeguarding process for safeguarding concerns rather than using a
          general session note unless instructed otherwise.
        </p>
        <p>
          Do not share a database or diagnostic export with anyone other than
          authorised support staff through an approved secure channel.
        </p>
      </InformationSection>

      <InformationSection
        id="professional-judgement"
        title="5. Assessments, grouping, and professional judgement"
      >
        <p>
          The app records literacy evidence and may help organise learners into
          teaching groups. Scores, progress views, and grouping outputs support
          professional judgement. They do not replace an Education Assistant,
          teacher, programme manager, or other authorised professional.
        </p>
        <p>
          Do not use an app result as the sole basis for a legal, disciplinary,
          employment, admission, exclusion, or similarly significant decision
          about a learner or staff member.
        </p>
        <p>
          If a result appears incorrect, incomplete, or inconsistent with what
          happened in the classroom, pause before relying on it and report the
          issue.
        </p>
      </InformationSection>

      <InformationSection id="offline" title="6. Offline use and synchronisation">
        <p>
          The app keeps core teaching records on the device when connectivity
          is unreliable and uploads pending work when connectivity returns.
        </p>
        <p>You are responsible for:</p>
        <ul>
          <li>
            allowing pending work to synchronise when a connection is
            available;
          </li>
          <li>
            checking sync warnings before signing out, changing accounts,
            deleting the app, clearing app storage, resetting the device, or
            transferring the device;
          </li>
          <li>reporting repeated sync errors; and</li>
          <li>
            not assuming a record visible on one phone is already available on
            another device.
          </li>
        </ul>
        <p>
          Offline support reduces connectivity risk but cannot guarantee that
          data will never be delayed, duplicated, corrupted, or lost. Follow
          programme device, backup, and incident procedures.
        </p>
      </InformationSection>

      <InformationSection
        id="location"
        title="7. Location, time records, and messages"
      >
        <p>
          When you clock in or clock out, the app requests foreground location
          to support work-site time verification. It does not intentionally
          track continuous background location. Record time honestly and do not
          manipulate device location, time, permissions, or connectivity to
          falsify a record.
        </p>
        <p>
          The app&apos;s time record does not replace a formal attendance,
          payroll, or employment process unless the programme expressly
          designates it for that purpose.
        </p>
        <p>
          Phone notification permission is optional. Delivery can be delayed
          by connectivity, device settings, or platform services. Do not rely
          on push notifications as the only channel for emergencies,
          safeguarding incidents, or other time-critical communication.
        </p>
      </InformationSection>

      <InformationSection
        id="availability"
        title="8. Updates and availability"
      >
        <p>
          We may update the app to improve functionality, security,
          compatibility, or programme delivery. Updates may be delivered
          through the app stores or approved app-update services.
        </p>
        <p>
          We aim to keep the app available and reliable, but access can be
          interrupted by maintenance, connectivity, device limitations,
          service-provider incidents, security measures, or other operational
          causes. Features may change or be retired after appropriate programme
          communication.
        </p>
      </InformationSection>

      <InformationSection
        id="legal"
        title="9. Ownership, responsibility, and governing law"
      >
        <p>
          The app, programme content, design, code, trademarks, and
          documentation are owned by or licensed to Masinyusane and relevant
          programme partners. Authorised users receive a limited, revocable,
          non-transferable right to use the app for approved programme
          purposes. No ownership is transferred.
        </p>
        <p>
          The app is a programme support tool. To the extent permitted by law,
          it is provided subject to the programme arrangements that apply to
          the user, school, and participating organisations. Nothing in these
          terms excludes or limits a right, remedy, duty, or liability that
          cannot lawfully be excluded or limited.
        </p>
        <p>
          These terms are governed by the laws of the Republic of South Africa.
          Please contact us first so that concerns can be investigated and,
          where possible, resolved through the applicable programme process.
        </p>
      </InformationSection>

      <InformationSection id="contact" title="10. Support and contact">
        <p>
          For account access, incorrect records, suspected data exposure,
          device loss, or app support, visit the{" "}
          <Link href="/support">App Support page</Link> or email{" "}
          <a href="mailto:zama@masinyusane.org">zama@masinyusane.org</a>.
        </p>
        <p>
          Include the app version and build number shown in Profile. Never send
          a password. Do not include learner names or attach a database export
          unless authorised support staff request it through an approved secure
          channel.
        </p>
        <address className="not-italic">
          <strong>Masinyusane Development Organisation</strong>
          <br />
          Contact: Zama Zulu
          <br />
          NPO 074-244
          <br />
          72 Russell Road, Central
          <br />
          Gqeberha 6001, South Africa
        </address>
        <p>
          We may update these terms when the app, programme, or legal
          requirements change. Where a material change requires additional
          notice or acceptance, we will use an appropriate programme or in-app
          process.
        </p>
      </InformationSection>
    </PublicInformationPage>
  );
}
