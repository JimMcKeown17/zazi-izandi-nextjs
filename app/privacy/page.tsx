import type { Metadata } from "next";

import {
  InformationSection,
  PublicInformationPage,
} from "@/components/layout/public-information-page";

const LAST_UPDATED = "24 July 2026";

export const metadata: Metadata = {
  title: "App Privacy Notice | Zazi iZandi",
  description:
    "How the Zazi iZandi mobile app collects, uses, stores, and protects personal information.",
  alternates: {
    canonical: "https://www.zazi-izandi.co.za/privacy",
  },
};

const contents = [
  { href: "#who-we-are", label: "Who we are" },
  { href: "#scope", label: "Who and what this covers" },
  { href: "#information", label: "Information we process" },
  { href: "#purposes", label: "Why we process it" },
  { href: "#sharing", label: "Storage and service providers" },
  { href: "#retention", label: "Retention and security" },
  { href: "#rights", label: "Your rights and choices" },
  { href: "#children", label: "Children's information" },
  { href: "#contact", label: "Contact and complaints" },
];

export default function PrivacyPage() {
  return (
    <PublicInformationPage
      eyebrow="Mobile app"
      title="Privacy Notice"
      summary="This notice explains what personal information the Zazi iZandi app processes, why it is needed, and how Education Assistants, learners, and their representatives can exercise their privacy rights."
      lastUpdated={LAST_UPDATED}
      contents={contents}
    >
      <InformationSection id="who-we-are" title="1. Who we are">
        <p>
          The Zazi iZandi mobile app is operated by{" "}
          <strong>Masinyusane Development Organisation</strong>, a registered
          South African non-profit organisation (074-244-NPO), for the Zazi
          iZandi literacy programme.
        </p>
        <p>
          Masinyusane is the contact point for personal information processed
          through the app. Zazi iZandi is delivered with programme partners and
          participating schools. Where another organisation determines why and
          how information is processed for a particular activity, that
          organisation may also have responsibilities under the Protection of
          Personal Information Act 4 of 2013 (POPIA).
        </p>
      </InformationSection>

      <InformationSection
        id="scope"
        title="2. Who and what this notice covers"
      >
        <p>
          Zazi iZandi is a professional field tool for authorised adult
          Education Assistants and programme staff. Children do not create app
          accounts or use the app independently.
        </p>
        <p>The app processes information about:</p>
        <ul>
          <li>
            authorised adult users, including Education Assistants and
            programme staff;
          </li>
          <li>learners participating in the literacy programme; and</li>
          <li>
            programme activities such as assessments, teaching sessions,
            grouping, attendance, communication, and work-site time.
          </li>
        </ul>
      </InformationSection>

      <InformationSection
        id="information"
        title="3. Information we process"
      >
        <h3>Adult account and device information</h3>
        <p>We may process:</p>
        <ul>
          <li>
            name, email address, staff profile, account identifiers, assigned
            school, class, role, and programme association;
          </li>
          <li>
            authentication information managed by our authentication provider;
          </li>
          <li>
            app version, device platform, notification permission status, and
            push token; and
          </li>
          <li>account support and password-reset activity.</li>
        </ul>
        <p>We do not store a readable copy of a user&apos;s password.</p>

        <h3>Learner and teaching information</h3>
        <p>Authorised users may record or access:</p>
        <ul>
          <li>
            learner name, age or birth information, gender, grade, class,
            school, and programme level where used by the programme;
          </li>
          <li>
            teacher, Education Assistant, class, school, and teaching-group
            assignments;
          </li>
          <li>
            literacy assessment attempts, responses, scores, accuracy,
            language, completion time, and progress history;
          </li>
          <li>
            letters taught or mastered, grouping recommendations and changes;
            and
          </li>
          <li>
            session dates, duration, attendance, activities, and relevant
            notes.
          </li>
        </ul>

        <h3>Work-site time and foreground location</h3>
        <p>
          When an Education Assistant chooses to clock in or clock out, the app
          requests foreground location permission and attempts to record the
          time and coordinates for that action. The app does not intentionally
          track continuous or background location. If a location fix is
          unavailable, the time record may contain no coordinates.
        </p>

        <h3>Programme messages and offline records</h3>
        <p>
          If notification permission is granted, the app may process a push
          token, programme messages assigned to the user, and whether a message
          has been seen, read, or dismissed. Notification permission is
          optional.
        </p>
        <p>
          Programme data is also stored in an on-device SQLite database so
          authorised users can keep working without reliable connectivity.
          Pending records are sent to the programme backend when connectivity
          returns.
        </p>

        <h3>Technical support and website usage</h3>
        <p>
          The app keeps short-lived technical logs on the device for support.
          A user may deliberately export logs or a local database through the
          phone&apos;s share sheet. A database export can contain sensitive
          adult and learner information and must be shared only through an
          approved secure support channel.
        </p>
        <p>
          This website uses Vercel Analytics to collect limited technical and
          usage information about public pages so we can understand site
          performance and improve the visitor experience.
        </p>
      </InformationSection>

      <InformationSection id="purposes" title="4. Why we process information">
        <p>We process information for defined programme purposes, including:</p>
        <ul>
          <li>providing and securing authorised access to the app;</li>
          <li>
            delivering literacy support, recording programme activity, and
            monitoring learner progress;
          </li>
          <li>
            supporting teaching decisions, organising groups, and maintaining
            accurate programme records;
          </li>
          <li>
            keeping offline and server records consistent, recording work-site
            time, and sending programme communications;
          </li>
          <li>
            maintaining, updating, troubleshooting, and securing the app; and
          </li>
          <li>
            meeting safeguarding, audit, reporting, contractual, and legal
            obligations.
          </li>
        </ul>
        <p>
          The applicable POPIA justification depends on the information and
          programme relationship. It may include performing an agreement,
          complying with a legal obligation, protecting a learner&apos;s
          legitimate interests, pursuing a legitimate programme interest, or
          valid authorisation or consent where required.
        </p>
        <p>
          We do not sell personal information. We do not use app information
          for third-party advertising, behavioural advertising, or cross-app
          tracking.
        </p>
        <p>
          Assessment evidence may help suggest or organise teaching groups.
          These features support professional judgement and are not intended
          to make final legal, disciplinary, employment, admission, or other
          similarly significant decisions without human review.
        </p>
      </InformationSection>

      <InformationSection
        id="sharing"
        title="5. Storage and service providers"
      >
        <p>Information may be stored or processed:</p>
        <ul>
          <li>on the authorised user&apos;s device;</li>
          <li>
            in the Zazi iZandi backend and systems used by authorised programme
            administrators;
          </li>
          <li>
            by Supabase for database, synchronisation, and related backend
            services;
          </li>
          <li>
            by Expo for app updates and push-notification delivery; and
          </li>
          <li>
            by Apple, Google, and other approved providers where needed to
            distribute, operate, secure, or support the app.
          </li>
        </ul>
        <p>
          Service providers act only for authorised service purposes and are
          subject to applicable contractual, confidentiality, and security
          requirements. Some providers may process information outside South
          Africa. Where that happens, we use the legal and contractual
          safeguards required for cross-border processing.
        </p>
        <p>
          We may disclose information where required by law, to protect the
          safety or rights of learners and users, or to authorised schools,
          programme partners, and funders where the disclosure is necessary
          and permitted for programme delivery or reporting. We aim to use
          aggregated or de-identified reporting where individual information
          is not needed.
        </p>
      </InformationSection>

      <InformationSection
        id="retention"
        title="6. Retention and security"
      >
        <p>
          We keep personal information only for as long as it is needed for the
          purpose for which it was collected or as required by programme,
          safeguarding, audit, employment, education, funder, contractual, or
          legal obligations. When retention is no longer justified,
          information is deleted, destroyed, or de-identified through the
          applicable process. Backup copies may take additional time to expire.
        </p>
        <p>
          We use reasonable technical and organisational safeguards designed
          to protect confidentiality, integrity, and availability. These
          include authenticated access, permission controls, encrypted network
          connections, local data isolation, controlled administrative access,
          and offline synchronisation safeguards.
        </p>
        <p>
          No system can guarantee absolute security. Users must protect their
          devices and credentials, avoid sharing accounts, and report suspected
          loss, unauthorised access, or security incidents promptly.
        </p>
      </InformationSection>

      <InformationSection
        id="rights"
        title="7. Your rights and choices"
      >
        <p>
          Subject to POPIA and any lawful limitations, a data subject or
          authorised representative may ask us to:
        </p>
        <ul>
          <li>confirm whether we hold personal information;</li>
          <li>provide access to personal information;</li>
          <li>correct or update inaccurate information;</li>
          <li>
            delete or destroy information that we are no longer authorised to
            retain;
          </li>
          <li>object to certain processing; and</li>
          <li>
            explain relevant processing or a material automated recommendation.
          </li>
        </ul>
        <p>
          Education Assistants may deny or later disable notification
          permission. Foreground location permission can be managed in device
          settings, although work-site clock-in may not function without it.
        </p>
        <p>
          Accounts are provisioned by programme administrators. The app does
          not offer self-service account creation. Users may request account
          closure and a review of associated information, but some programme
          records may need to be retained for lawful safeguarding, audit,
          employment, or reporting purposes.
        </p>
      </InformationSection>

      <InformationSection id="children" title="8. Children's information">
        <p>
          The app is operated by authorised adults for literacy programme
          delivery. Children do not create app accounts. Learner information is
          recorded only for authorised programme purposes such as assessment,
          instruction, attendance, grouping, and progress monitoring.
        </p>
        <p>
          Staff must record only relevant and authorised information, use
          synthetic data for demonstrations, and avoid placing unnecessary
          health, family, disciplinary, or other sensitive details in free-text
          notes. The programme relies on the applicable school, programme,
          parent or guardian, contractual, and statutory arrangements for
          processing children&apos;s information.
        </p>
      </InformationSection>

      <InformationSection id="contact" title="9. Contact and complaints">
        <p>
          To request access, correction, deletion, objection, or another
          privacy review, email{" "}
          <a href="mailto:info@masinyusane.org">info@masinyusane.org</a>. Do not
          include a password or unnecessary learner information in the first
          message. We may need to verify identity and authority before acting.
        </p>
        <address className="not-italic">
          <strong>Masinyusane Development Organisation</strong>
          <br />
          NPO 074-244
          <br />
          72 Russell Road, Central
          <br />
          Gqeberha 6001, South Africa
        </address>
        <p>
          You may also lodge a POPIA complaint with South Africa&apos;s{" "}
          <a
            href="https://inforegulator.org.za/complaints/"
            target="_blank"
            rel="noreferrer"
          >
            Information Regulator
          </a>
          .
        </p>
        <p>
          We may update this notice when the app, programme, service providers,
          or legal requirements change. The current version and last-updated
          date will remain available at this URL.
        </p>
      </InformationSection>
    </PublicInformationPage>
  );
}
