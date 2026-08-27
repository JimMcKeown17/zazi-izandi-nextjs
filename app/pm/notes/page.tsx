import type { Metadata } from "next";
import { LETTER_SEQUENCES } from "@/lib/pm/constants";

export const metadata: Metadata = {
  title: "Notes | PM Dashboard",
};

export default function NotesPage() {
  return (
    <div className="max-w-3xl mx-auto pb-16">
      <header className="mb-8">
        <h1 className="text-xl font-bold text-slate-900">Notes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Internal working document. Commentary, decisions, and reference
          material for the PM team.
        </p>
      </header>

      <Section title="What we're measuring, and why">
        <p>
          The dashboard exists to answer two questions. First: is the programme
          running? Dosage metrics — sessions per day, days worked per week,
          group coverage — answer that. Second: are the sessions any good?
          Quality metrics — letter alignment and the quality flags — answer
          that.
        </p>
        <p>
          Both axes matter. A programme that isn&rsquo;t running has no impact
          regardless of quality. A programme that runs constantly but teaches
          the wrong letters builds dosage numbers without moving the children.
          The intervention only works when both are healthy.
        </p>
      </Section>

      <Section title="The EA quadrant framework">
        <p>
          The Education Assistants page plots every EA on a scatter chart. The
          x-axis is dosage (sessions per programme day). The y-axis is letter
          alignment (percent of sessions teaching letters the children are
          ready for). Four quadrants fall out of that.
        </p>
        <QuadrantEntry
          label="Top-right — high dosage, high alignment"
          body="The goal state. The programme is running and the sessions are on the right letters. No intervention needed; worth understanding what is working here so it can be copied."
        />
        <QuadrantEntry
          label="Top-left — low dosage, high alignment"
          body="The EA knows what to teach but isn't teaching often enough. Dosage levers apply."
        />
        <QuadrantEntry
          label="Bottom-right — high dosage, low alignment"
          body="The EA is running plenty of sessions but teaching the wrong letters. Quality levers apply — a training and pedagogy gap rather than a logistics one."
        />
        <QuadrantEntry
          label="Bottom-left — low dosage, low alignment"
          body="Needs both. Highest priority for intervention, and sometimes the signal that the problem isn't something levers can fix on their own (wrong placement, school access, structural)."
        />
      </Section>

      <Section title="Levers">
        <p>
          This is a living list of the levers we have for moving the two axes.
          It is an open question which are most effective — we&rsquo;re
          measuring as we go.
        </p>
        <div className="grid md:grid-cols-2 gap-8 mt-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Dosage
            </h3>
            <LeverGroup title="In use">
              <Lever name="Mentor visit">
                Strongest lever for getting a programme up and running. Weaker
                signal on quality.
              </Lever>
              <Lever name="PM dashboard visibility">
                Making dosage legible to the PM team so problems get escalated
                early.
              </Lever>
              <Lever name={"EA-facing \u201CMy Kids\u201D page"}>
                In progress. Makes dosage legible to the EA themselves before
                PM has to intervene.
              </Lever>
            </LeverGroup>
            <LeverGroup title="Worth considering">
              <Lever name="School-level escalation">
                When the blocker is structural — principal access, timetable,
                space — it needs a conversation with DoE or Masi leadership,
                not another mentor visit.
              </Lever>
              <Lever name="WhatsApp nudges">
                Short check-ins from the Masi office or, later, automated from
                Python. Lowest-cost lever we can test, but unproven.
              </Lever>
            </LeverGroup>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Quality
            </h3>
            <LeverGroup title="In use">
              <Lever name="Letter alignment dashboard">
                Surfaces the misalignment so it can be seen at all.
              </Lever>
              <Lever name="Quality flags">
                Per-group bookkeeping of what is going wrong, so PM knows
                where to look.
              </Lever>
            </LeverGroup>
            <LeverGroup title="Worth considering">
              <Lever name="Retraining">
                Targeted workshop for EAs in the bottom-right quadrant, focused
                specifically on letter sequencing.
              </Lever>
              <Lever name="AI feedback">
                Future build. An external check on what the EA is about to
                teach before they teach it.
              </Lever>
            </LeverGroup>
          </div>
        </div>
      </Section>

      <Section title="Open questions & decisions">
        <p className="text-xs text-slate-500 mb-3">
          Most recent at top. Resolved items stay in the list with the
          resolution appended inline.
        </p>
        <ul className="space-y-2 list-none pl-0">
          <LogEntry date="2026-04-13" title="Audience">
            Who are the dashboard pages for? Funders, EAs themselves, internal
            PM, mentors? Different audiences want different framings. Open.
          </LogEntry>
          <LogEntry date="2026-04-13" title="Check-in sessions in dosage">
            Do check-in sessions exist in the TeampactSession2026 table and
            should they be excluded from dosage calculations? Under
            investigation.
          </LogEntry>
          <LogEntry date="2026-03-12" title="Language detection">
            Decided: determine group language via participant → assessment
            linking, not school-level lookup. Mixed-language schools exist.
          </LogEntry>
          <LogEntry date="2026-03-08" title="Umbrella groups">
            Decided: &ldquo;Grade X — School&rdquo; umbrella groups excluded at
            the Django backend (~28 sessions). Done.
          </LogEntry>
          <LogEntry date="2026-03" title="Ghost group flag">
            Decided: ghost group is an attendance signal, not a quality one.
            Excluded from EA quality ranking; surfaced on the Sessions tab
            instead.
          </LogEntry>
        </ul>
      </Section>

      <Section title="Roadmap">
        <RoadmapGroup title="Project management">
          <li>Flag lifecycle: acknowledge, resolve, dismiss</li>
          <li>Mentor visit acknowledgements</li>
          <li>Per-flag PM workflow</li>
        </RoadmapGroup>
        <RoadmapGroup title="Education Assistant experience">
          <li>
            Full per-EA login page showing their own stats, flags, and
            suggestions (built on /my-kids)
          </li>
        </RoadmapGroup>
        <RoadmapGroup title="AI">
          <li>AI feedback and analysis on session plans and outcomes</li>
          <li>AI chatbot / tutor for EAs</li>
        </RoadmapGroup>
        <RoadmapGroup title="Mobile">
          <li>
            ZZ mobile app: two-way comms, reminders, tips, badges, built-in
            letter tracker
          </li>
        </RoadmapGroup>
        <RoadmapGroup title="Data quality">
          <li>
            /pm/data-quality page for exportable lists (unmatched children,
            coverage rates) for field-team investigation
          </li>
        </RoadmapGroup>
      </Section>

      <Section title="Reference: letter orders">
        <p>
          These are the teaching sequences the programme uses. Letter alignment
          is measured against them — a session is on target when it teaches a
          letter from the appropriate position in this sequence for the
          group&rsquo;s current progress.
        </p>
        <div className="space-y-6 mt-4">
          {(Object.keys(LETTER_SEQUENCES) as Array<keyof typeof LETTER_SEQUENCES>).map(
            (language) => (
              <LetterOrderTable
                key={language}
                language={language}
                letters={LETTER_SEQUENCES[language]}
              />
            )
          )}
        </div>
      </Section>

      <Section title="Reference: quality flags">
        <p>
          Each flag below is computed nightly by the Django backend and
          surfaced on the Quality Flags page. The definitions here mirror the
          info tooltips on that page.
        </p>
        <dl className="space-y-5 mt-4">
          <FlagDef
            name="Same Letter Groups"
            trigger="An EA has 3 or more letter-phase groups at the same progress position."
            meaning="The EA is not differentiating instruction between groups."
            action="Mentor should work with the EA on group-specific pacing."
          />
          <FlagDef
            name="Moving Too Fast"
            trigger="More than 70% of consecutive sessions introduce entirely new letters with no overlap from the previous session."
            meaning="Children need review and repetition to consolidate. Skipping review short-changes consolidation."
            action="EA needs retraining on the review cycle — each session should revisit at least one letter from the prior session."
          />
          <FlagDef
            name="Ghost Groups"
            trigger="A group has not had any session logged in 5 or more weekdays, excluding school holidays."
            meaning="An attendance and activity issue rather than a quality issue."
            action="Check with the EA and school whether the group still exists or the EA is absent."
          />
          <FlagDef
            name="Stagnation"
            trigger="The maximum letter taught has not changed for 2+ weeks despite 4+ sessions in the recent period."
            meaning="The EA is running sessions but not progressing through the curriculum."
            action="Mentor should assess whether children need more time on the current letter or if the EA is stuck."
          />
          <FlagDef
            name="Not Following Letter Order"
            trigger="2 or more letters in the language-specific teaching sequence were never taught before the EA moved past them."
            meaning="Skipping letters means children miss foundational building blocks."
            action="EA needs retraining on following the letter sequence."
          />
          <FlagDef
            name="Unbalanced Groups"
            trigger="Coming in a future phase."
            meaning="Will flag EAs whose groups have very uneven session counts."
            action="Not yet implemented."
          />
        </dl>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 pt-8 mt-8 first:border-t-0 first:pt-0 first:mt-0">
      <h2 className="text-base font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="text-sm text-slate-700 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function QuadrantEntry({ label, body }: { label: string; body: string }) {
  return (
    <p>
      <span className="font-semibold text-slate-900">{label}.</span> {body}
    </p>
  );
}

function LeverGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
        {title}
      </p>
      <ul className="space-y-2 list-none pl-0">{children}</ul>
    </div>
  );
}

function Lever({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <span className="font-semibold text-slate-900">{name}.</span> {children}
    </li>
  );
}

function LogEntry({
  date,
  title,
  children,
}: {
  date: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <span className="font-mono text-xs text-slate-500">{date}</span>{" "}
      <span className="font-semibold text-slate-900">{title}.</span> {children}
    </li>
  );
}

function RoadmapGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
      <ul className="list-disc pl-5 space-y-1">{children}</ul>
    </div>
  );
}

function LetterOrderTable({
  language,
  letters,
}: {
  language: string;
  letters: readonly string[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 mb-2">{language}</h3>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              {letters.map((_, i) => (
                <th
                  key={i}
                  className="border border-slate-300 px-2 py-1 text-slate-500 font-normal w-8 text-center"
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {letters.map((letter, i) => (
                <td
                  key={i}
                  className="border border-slate-300 px-2 py-1 font-mono text-slate-900 text-center"
                >
                  {letter}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlagDef({
  name,
  trigger,
  meaning,
  action,
}: {
  name: string;
  trigger: string;
  meaning: string;
  action: string;
}) {
  return (
    <div>
      <dt className="font-semibold text-slate-900">{name}</dt>
      <dd className="mt-1 space-y-1 text-slate-700">
        <p>
          <span className="text-slate-500">Trigger: </span>
          {trigger}
        </p>
        <p>
          <span className="text-slate-500">What it means: </span>
          {meaning}
        </p>
        <p>
          <span className="text-slate-500">Action: </span>
          {action}
        </p>
      </dd>
    </div>
  );
}
