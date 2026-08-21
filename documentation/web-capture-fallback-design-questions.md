# Web Capture Fallback — Grilling Doc

> **SUPERSEDED DESIGN INPUT — DO NOT IMPLEMENT.** This document preserves the
> original questions and reasoning history. Its present-tense proposals include
> rejected `capture_source` changes, direct/RLS write assumptions, v1 Letter
> Mastery/backfill, and Django or stale-clock machinery. The governing executable
> plan is
> [2026-08-20-web-capture-lean-v1.md](../docs/superpowers/plans/2026-08-20-web-capture-lean-v1.md).
> Where the documents differ, the governing lean plan wins.

# Quick Overview

Zazi iZandi's field data — clock-ins, sessions, what was taught, and eventually assessments — is captured by our Expo mobile app writing to Supabase, but roughly a third of onboarded EAs can't reliably use it yet: the app isn't in the public stores, Huawei phones have no Play Store, low-storage devices choke on it, and a few installs are still bug-prone. Every one of those EAs is doing real work that goes unrecorded, which matters because this data drives payroll, daily coaching feedback, an independent RCT, and funder reporting — and with 40 new EAs arriving in two weeks, a few hundred in a month or two and ~1,000 in January 2027, the gap will recur with every cohort. So we're building Zazi iZandi Web: a small, mobile-first Next.js app at its own subdomain where an EA logs in with the same Supabase credentials as the mobile app, sees their own roster and groups, clocks in and out, and records sessions (attendance, letters or blends taught, Letter Tracker, notes) — writing rows directly into the same Supabase tables as the app, under the same row-level security, stamped capture_source='web', so they're indistinguishable to every dashboard and flow back into the EA's app history the moment they do get it installed. It is deliberately not a second app: no offline sync engine, no roster management, no assessments in v1 — just the capture surface that can't be allowed to fail, built so that anything that dodges the app's distribution problems (any browser, any phone, no install) keeps the field record complete while the app matures.


Answer inline under each `**Answer:**`. Push back wherever I'm wrong. Questions are grouped so that later sections depend on earlier ones; if an answer in B changes something in D, just say so and I'll re-derive.

---

## 0. What the explorers found (facts, not opinions)

These are the facts that reshaped the questions. Skim them once; everything below refers back.

### The three repos

| Repo | Role | Auth | DB |
|---|---|---|---|
| `zazi-izandi-app` (Expo/RN 0.81, JS) | Field capture client. Offline-first. | **Supabase email+password** (`signInWithPassword`), admin-provisioned | Supabase project `yaclyyurdwarhmiheojr` |
| `zazi-izandi-nextjs` (Next 16, Clerk) | Public site, `/pm` dashboards, `/my-kids` (EA), `/mobile-app/*` (staff view of app data) | **Clerk**, passwordless email code; EA identity keyed on `teampact_user_id` | None — reads everything via Django |
| `Zazi_iZandi_Website_2025` (Django) | Reporting backend; TeamPact nightly sync; a few write endpoints | Shared secret `X-Internal-Auth`; Clerk JWT verifier on `/api/mobile/*` | Own Render Postgres + service-role Supabase client |

### Two session universes, nothing reconciles them
1. **TeamPact → Django `sessions_2026`** — every 2026 report, `/pm`, `/my-kids`, group summaries, letter alignment. Being retired.
2. **App → Supabase `sessions` / `session_attendees` / `time_entries`** — the future. Read by `/mobile-app/*` dashboards only via allowlisted RPCs. **Clock-in exists only here; Django has no clock-in table at all.**

### The app's write surface (what a web client would need to replicate)
- **Clock in/out → `time_entries`**: `id (client uuid), user_id, sign_in_time, sign_in_lat/lon, sign_out_time, sign_out_lat/lon, auto_clocked_out`. GPS via expo-location, 10s timeout; timeout → proceeds with null coords; permission *denied* → clock-in blocked. Auto clock-out at 10h. Server accepts null coordinates (migration `20260818000000`).
- **Session → `sessions` (1 row) + `session_attendees` (1 per child on roster) + `letter_mastery` (0..n)**. Draft: `groupId, levelSnapshot ('letters'|'blending'), sessionDate (supports backfill), attendees[] with present/absent/excused, selectedLetters[], blendCategories[], blendExamples, childReadingLevels{}, letterTrackerChanges{}, comments, started_at/ended_at/duration_seconds` (live timer, 20-min target, pause-aware). `session_type` hardcoded `'Literacy Coach'`. Validation: ≥1 present; letters level ≥1 letter; blending ≥1 category. **Session start is gated on being clocked in.**
- **Assessment → `assessments` + `assessment_items`**: timed 60s EGRA, monotonic clock, stop rule (warn 5 / stop 10 consecutive wrong), two capture UIs, versioned 60-letter instruments per language, Grade 1–3 runs letter + word steps. Heaviest flow in the app.
- **Roster**: `staff_children ∪ child_ea_assignments` by `user_id` → `children`, `groups`, `child_group_memberships`. RLS scopes it.

### RLS boundary (this draws the cheap/expensive line)
- **Directly writable by the EA's own Supabase session** (`user_id = auth.uid()` policies): `time_entries`, `sessions`, `session_attendees`, `assessments`, `assessment_items`, `letter_mastery`. → **Capture is cheap.**
- **Not writable** (authenticated DML revoked 2026-08-15; protocol-v2 RPC envelope required): `classes`, `groups`, `staff_children`, assignment ledgers. → **Roster/grouping management is expensive.** Keep it out.

### Other load-bearing facts
- App pull-merge is **pending-local-wins**: rows written by a web client pull down into the EA's app history once they install. Web capture is not a silo.
- **Pure-logic modules with zero RN imports** — importable into a web client as-is: `activeSessionState.js`, `sessionCaptureValidator.js`, `assessmentScoring.js`, `assessmentStopRule.js`, `sequentialAssessmentReducer.js`, `assessmentFlow.js`, `egraConstants.js`, `literacyConstants.js`, `localDate.js`.
- **Expo web is not a shortcut**: `react-native-web` not installed; data layer is `expo-sqlite` + 172 KB of migrations. Option (c)-as-build-flag is a data-layer rewrite.
- Website has **zero PWA scaffolding** (`next.config.ts` is empty) and **zero Supabase client libs**; documented rule: "this repository never queries Supabase directly."
- Install failures (`chore/field-apk-distribution` branch, `install-troubleshooting.md`): Play internal-track email mismatch, Huawei (no Play), Android <7, low storage (zero-byte font asset on SM-A055F; SQLite failures on SM-A165F/CPH2669). Production-APK lane for Huawei is **held** by your 2026-08-17 decision. Huawei population expected "dozens-to-hundreds".
- Django `ea` role has **zero capabilities** in `ROLE_CAPABILITIES`; non-mobile `/api/*` has no per-user auth.

---

## A. Settled so far

- **Q1 Root causes** — distribution (test-track email mismatch, Huawei, low storage) + app reliability. Not login, not UX. *Implication: a web client dodges every distribution failure and doubles as a reliability fallback. But low-storage phones are also the old-Chrome/Huawei-Browser phones; test there, not on your phone.*
- **Q2 Scale** — 179 → 111 fully working today (~38% not reliably capturing). 40 more in 2 weeks. ~1000 in Jan 2027. *Implication: this is a permanent onboarding ramp, not a two-week bandaid. At 1000 users, a 20% fallback rate is 200 people. Design it as a second first-class client, scoped small.*
- **TeamPact is being replaced by the app.** Django stays as an important piece; Django/Supabase split to be optimised later.
- **Destination (was Q13)** — I'm treating as settled: rows land in the app's Supabase tables with the EA's real `auth.users.id`. Anything else creates a third universe. **Say so if you disagree.**

---

## B. Field reality (Q3–Q9, from round one — still open)

❓ **Q3 — Connectivity at the point of capture.** When an EA clocks in and runs a session at a school, do they reliably have data *at that moment*? Or is the pattern "capture offline, sync at home / on WiFi"? 

*Implication:* this is the fork between a plain online form and an offline queue. An online-only form fails silently at 07:55 in a school with one bar — exactly when it matters. The app team built a 156 KB outbox for a reason; I need to know how much of that reason is connectivity vs. engineering enthusiasm.
*Middle ground worth knowing about (see Q24):* a form that persists its draft to `localStorage` and retries submit on reconnect costs ~a day and covers the "flaky, not absent" case without a service worker. 

➡️ My guess: flaky-not-absent. Tell me.

**Answer:**
They will be online about 75% of the time. We could tell them that they have to be online to submit, but it's better if there is an offline solution because, like I said, about a quarter of the time they won't have data or they won't be online.

Yeah, this local storage solution could definitely be a potential option, a middle ground worth considering.

yes, this is correct. It is flaky, not absent.

---

❓ **Q4 — Live vs retrospective capture.** Must the web client capture *live* (clock in now with GPS; timer running during the session), or is a **retrospective log** acceptable ("yesterday, School X, 08:00–13:00, these 4 sessions")?

*Implication:* the app's session flow is live (timer, pause, 20-min target, clock-in gate). Retrospective drops the timer and the gate, and `started_at/ended_at/duration_seconds` become EA-entered rather than measured. Data shape is identical; trust is not. The app already supports a backfill date on sessions, so retrospective *sessions* have precedent; retrospective *clock-in* does not.

➡️ Recommend: **live-first UI with backfill allowed**. Same as the app. Don't invent a different mental model for the same people who'll move to the app in a month.

**Answer:**

Yeah, I agree. I think we should try to have live-first UI with backfill. For what it's worth, the GPS is not mission-critical right now. I'm not too worried about fraudulent submissions with this backup system. Similarly, the timer is not mission-critical either. The critical things are:
- Capturing the sessions that occurred
- The days worked
- Lock-in
- Clock-out
- What they did during those sessions
- Potentially assessments of children too We would need that if it's a brand-new EA and a new cohort that can't get up and running. Part of the critical workflow is actually assessing kids and then running the grouping logic. Backfill should probably be allowed, retrospective backfill.

---

❓ **Q5 — Who types it in?** EA themselves only, or also proxy capture by a coach/mentor/PM on the EA's behalf?

*Implication:* proxy capture needs a role the app doesn't have (single role: EA), an "acting as" model in the write path, and provenance columns. It's a different product. The website's `/pm` staff could do it, but `/pm` is Clerk/TeamPact-keyed and would need the same identity bridge as Q10(b).

➡️ Recommend: **EA-only in v1.** Proxy capture is a legitimate v2 once the write path exists — but it should be deliberate, not smuggled in.

**Answer:**

EA types it all in

---

❓ **Q6 — What's the data used for downstream?** Does clock-in feed **stipend/payroll**? Do sessions feed **funder dosage reporting**?

*Implication:* if clock-in drives pay, self-reported times need a coach sign-off or at least the same GPS stamp the app collects. Note: browser Geolocation gives comparable lat/lon to expo-location, so a *live* web clock-in is no less trustworthy than the app's (both are spoofable by a determined person; neither is by an ordinary one). A *retrospective* web clock-in is materially weaker.

➡️ Tell me which; it decides whether Q4 can be retrospective for clock-in.

**Answer:**

Oh, well, it's great if browser geolocation generally works. Clocking does drive pay, but again, this is the backup system. It doesn't have to be perfect. We'd be willing to allow a larger error bar here than on the main app, and we will just overpay people a little bit. It'll be basically the tax of the backup system in my head. Sessions are very important, and what they did in the sessions is very important. A key part of what we're doing is trying to track the work of the EA every day, process it on the backend, and then help them correct course to improve session quality. This is being independently researched. There are random control trials behind it, so the data itself is very important, and it's used for a lot of stuff, including funder reporting.

---

❓ **Q7 — Parity.** *(Largely answered by the destination decision.)* Remaining sub-question: do you want web-captured rows **marked** as such? See Q16.

**Answer:**

Yes, destination matters. I definitely want web captured rows marked as such.

---

❓ **Q8 — What happens today** for the 34 who can't capture? Paper, WhatsApp to a coach, nothing? Is anyone backfilling manually?

*Implication:* whatever exists today is option zero and the bar to beat. If coaches are receiving WhatsApps, that's evidence for Q5 proxy capture; if it's paper, a backfill-friendly form (Q4) matters more than live.

**Answer:**

Right now, the cohort is using paper, but that's the ultimate backstop. We are trying to get away from that because it requires a lot of upfront training, which these users have received, but future users will not have received as much of that training. Paper is essentially the backstop, but all paper is grabbing is a fraction of what we're talking about here. There's no actual clock in and clock out on paper. I guess they write their times down. It's that we don't capture as much.

---

❓ **Q9 — Assessments: out for v1, or out full stop?**

*Implication, updated by facts:* the scoring, stop rule and sequential reducer are pure JS and would port unchanged. What doesn't port is the UI discipline — 60s monotonic timer, background-pause, leave-guard, two capture modes, versioned instruments by index. It's a week of careful work, not a month. Still: the 2-week cohort deadline argues against it in v1.

➡️ Recommend: **out of v1, explicitly in v2**. Sessions + clock-in first; assessments after you've seen the fallback used in the field.

**Answer:**

Yeah, assessments can be out for version one. I do think, though, maybe we should have a compromise where they can do the assessments on paper and submit the results. That way they can get their groups, but the actual session capture and peer review capture do not need to be part of version one. That middle ground is something to consider, not definitely implement.

---

## C. Architecture (Q10–Q15 — unblocked by the explorer facts)

❓ **Q10 — Identity for the web client.**
- (a) **Supabase Auth** — same email+password as the app. RLS scoping free. Rows carry the EA's real `auth.uid()`.
- (b) **Clerk** — website login. Needs a Clerk→`auth.users.id` bridge via `staff_identity_links`, service-role writes, and a second account per EA at 1000 scale.

*Implications:* The Clerk EA identity is keyed on `teampact_user_id`, which is going away with TeamPact; new cohorts may never have one. The install-troubleshooting doc already records "two different emails confuse everyone" — (b) adds a third credential. (a) means password reset needs a web redirect URL (app uses `zz-app://reset-password`) — small, but it's a Supabase Auth config change to plan for.

➡️ **(a), firmly.**

**Answer:**

Yeah, we could go super base, but will that sit alongside clerk in some worlds? It's not that straightforward because all of our other users, like all of my staff, some funders, and partners, use clerk, and they have their roles defined in Django for what pages they can see. I'm not sure if you're implying that I move every single one of them over to super base also?

---

❓ **Q11 / Q14 — Write path.** *(Q14 supersedes Q11; keeping one slot.)*
- (a) **Django gatekeeper**: Next.js UI → Django endpoint (verifies the EA's *Supabase* JWT, validates payload, enforces `user_id == token.sub`, writes via service role / RPC) → Supabase. Pilots your funnel-through-Django direction on a small, bounded write surface (3 tables).
- (b) **Direct under RLS**: Next.js server action holds the EA's Supabase session and writes as the EA. RLS is the authority. No Django changes. JS validators reused as-is. Breaks the "never queries Supabase directly" rule — record the break, don't hide it.

*Costs of (a), honestly:* re-implement the ownership check RLS would do (one line); re-implement `sessionCaptureValidator.js` in Python (~40 lines); Django in the *synchronous* path of a clock-in at a school with one bar. **Verified:** Django runs on a paid Render **Starter (0.5 CPU / 512 MB)** web service — it does not spin down, so I retract the cold-start worry except on deploys. Load is trivial (1000 EAs clocking in over a 30-min window ≈ 0.5 writes/s). What's still unmeasured is hosted p95 — your own review docs mark it `UNVERIFIED` — so a latency budget and a client-side timeout/retry are part of (a), not optional. **Verified:** the Supabase project signs JWTs with asymmetric **ES256** and publishes `/auth/v1/.well-known/jwks.json` (one EC P-256 key). Django already does JWKS verification for Clerk in `api/mobile/auth.py` — Supabase becomes a second issuer on the existing verifier, not a new auth system. This removes most of the cost I'd attributed to (a). *Costs of (b):* logic in TS not Python; rule-break; moving behind Django later is a refactor (small, because the row shape doesn't change).

➡️ **(a) if you're committing to funnel-through-Django as the direction** — ideal pilot, keeps logic where you're productive. **(b) if undecided** — half the work, blocks nothing. Don't pick (a) for comfort alone; pick it because you want the pilot.

**Answer:**

Now, actually, you've talked me out of this. My instinct would not be to have the data flow through Django. Maybe when we pull the data out of Supabase, we process it in Django before it reaches the front end. In terms of E as collecting data in the field, my instinct is that it should just be direct under RLS to Supabase.

---

❓ **Q12 — Where does it live?**
- (a) Inside `zazi-izandi-nextjs` (e.g. `/capture` route group). Matches "log in to our website". But `proxy.ts` is Clerk-only and `/my-kids` is TeamPact-keyed → two auth systems and two identity keys in one app.
- (b) **Separate small Next.js app** (e.g. `app.zazi-izandi.co.za`), Supabase Auth only, importing the mobile app's pure-logic modules as a shared package. Natural seed of a full PWA if that ever happens.

*Implications:* (b) costs one more Vercel project and a shared-package setup (or a git submodule / copied modules — ask me and I'll recommend). (b) also isolates EA-facing uptime/support expectations from the marketing/PM site. Long-term, `/my-kids` will need re-keying off TeamPact anyway; when that happens, it could move into this app and the website loses its EA surface entirely. That's a cleaner end-state.

➡️ **(b).**

**Answer:**

Oh, this changes my answer above. Perhaps a small separate next to JS app, like app.sazeezande, is a good solution here because then it could be super base auth only. We import the pure logic. I like that idea. I'm perfectly happy to do that. Just let me know if there are other considerations, and you're saying long term that /my kids will need to rekey off TeamPact anyway over to super base. Yes, that makes sense to me too. I like this.

---

❓ **Q15 — UI stack.** Next.js (house standard, shadcn/Tailwind, needed if this ever grows offline/PWA) vs Django templates + HTMX (fastest possible pure webform; dead-end for anything offline).

➡️ **Next.js.** This is the one place "comfortable in Django" would actively cost you, given Q2 says it's not a throwaway.

**Answer:**

Now, absolutely next to JS, none of this can be Django templates. It needs to be the house standard: Next JS, ShadCN, Tailwind, etc.

---

## D. Scope & behaviour parity (new — depends on B and C)

❓ **Q16 — Provenance stamp.** Should web-captured rows be marked? `sessions`/`time_entries` have no source column today; `assessments` has `device_info`.
- (a) Add a nullable `capture_source text` (`'mobile'` default / `'web'`) to `sessions` and `time_entries` via migration. The app's pulls select explicit column lists, so an extra nullable column is invisible to it.
- (b) Don't mark; infer from absence of sync metadata.

*Implications:* (a) lets you measure fallback usage per cohort (how many of the Jan-2027 1000 are on web at week 2? week 6?), filter data-quality reviews, and later surface "captured via web" in `/mobile-app/*`. (b) is free today and unanswerable later.

➡️ **(a).** One migration, huge observability payoff.

**Answer:**

(a) - definitely

---

❓ **Q17 — Clock-in gate on sessions.** The app refuses to start a session unless clocked in. Replicate?

➡️ **Yes.** Same rule, same people. Dropping it on the web would make `time_entries` coverage worse for exactly the cohort you can least see.

**Answer:**

Yes.

---

❓ **Q18 — Session capture fields in v1.** The app captures: attendance per child (present/absent/excused), letters taught **or** blend categories + examples, per-child reading levels (blending), letter-tracker updates (`letter_mastery`), notes, timer. Which subset is v1?
- (a) **Minimal**: attendance + letters/blend categories + notes + start/end. Writes `sessions` + `session_attendees`.
- (b) **Full**: (a) + blend examples + child reading levels + letter tracker (`letter_mastery`).

*Implications:* (a) is the dosage record. (b) adds the instructional-progress signals that feed the Letter Tracker and, eventually, alignment. `letter_mastery` has a unique key on `(user_id, child_id, letter, language)` so it's an upsert, not a hard problem — but it's another screen.

➡️ **(a) for the 2-week cohort, (b) before Jan 2027.**

**Answer:**

Actually, I think we want B, the full version. It doesn't seem that much more complicated to me. If I'm wrong there, let me know, but lettermaster is such an important thing that I think it's worth having there as an option.

---

❓ **Q19 — Backfill window.** If Q4 allows backfill, how far back? The app lets an EA pick a past `sessionDate`. For clock-in, the app has no backfill at all.

➡️ Recommend: sessions backfill up to 7 days; clock-in **live only** (no backfill) unless Q6 says it's not payroll-linked, in which case allow same-day manual times.

**Answer:**

7 days is fine

---

❓ **Q20 — Who gets access?** All EAs, or only a flagged "fallback" cohort?

*Implications:* gating requires a flag somewhere (Supabase `staff_identity_links`? Django `EducationAssistant`?) and someone to maintain it. Not gating means any EA can use web — which is *also* the reliability fallback for app users with bugs (Q1). Risk: double capture (same session on web and app). Mitigation: the web client shows the EA's recent sessions and current clock state **from Supabase**, so they can see what's already recorded — and because the app pulls web rows, the app shows them too.

➡️ **No gating.** Every EA can use either client. Show recent history on the web to prevent doubles.

**Answer:**

No gating.

---

❓ **Q21 — Roster/grouping management on web.** Some new-cohort EAs won't have classes/groups set up yet (that's done in the app). If an EA can't install the app, can they still run sessions? Only if someone else has created their classes/groups/roster.

*Implications:* writing `classes`/`groups`/`staff_children` from web needs the protocol-v2 RPC envelope — expensive. Options: (a) out of scope — onboarding staff set up rosters via the app or a seed script before the EA starts; (b) a staff-side "set up this EA's roster" tool (would be Django-gatekeeper territory, Q14a); (c) build the RPC envelope client on web.

➡️ **(a) for v1**, and make it an explicit onboarding step: roster must exist before an EA gets a web login. Flag (b) as the most likely v2 because it's also what coaches need.

**Answer:**

(a) for v1**, and make it an explicit onboarding step: roster must exist before an EA gets a web login. Flag (b) as the most likely v2 because it's also what coaches need.

---

## E. Rollout & operations (new)

❓ **Q22 — Day-1 must-haves for the 40-cohort in 2 weeks.** My proposed v1: login → clock in/out (with GPS) → pick group → record session (Q18a) → see today's history. Nothing else. Agree?

➡️ Yes, and nothing else ships until this is used in the field by real EAs for a week.

**Answer:**

I don't have the full answer to this right now. I'd have to think about it, but that day one must have sounded reasonable, and I'll have people start testing it right away. I don't think we need an entire week with a real EA. I'll have multiple staff members testing it in the first couple of days, and we see how it goes.

---

❓ **Q23 — Device test matrix.** Can you get me (or a tester) one Huawei (AppGallery-era) and one low-storage Samsung (A05/A16 class) for the test plan? The phones that can't install the app are the ones the web client must work on; testing on an iPhone proves nothing.

**Answer:**

Yes, I can get you testers. Don't worry about that. That should be a given.

---

❓ **Q24 — Offline-lite.** Regardless of Q3, should v1 persist the in-progress draft (clock state, session form) to `localStorage`/IndexedDB and retry submission on reconnect? No service worker, no background sync — just "don't lose the form if the page reloads or the request fails."

*Implications:* ~a day of work. Covers flaky connectivity, not absent connectivity. Avoids the worst failure mode (EA fills in 20 minutes of attendance, hits submit, signal drops, everything gone).

➡️ **Yes**, as part of v1.

**Answer:**

**Yes**, as part of v1.

---

❓ **Q25 — Naming and how EAs are told about it.** "The app" already means the mobile app. What do EAs call this? Where does the link live (WhatsApp message, onboarding doc)? The install-troubleshooting doc has a ready-to-send WhatsApp template — this would be a second one.

➡️ Suggest a boring, distinct name ("Zazi iZandi Web") and a single URL with no path to remember.

**Answer:**

Agreed w/ suggestion

---

## F. If you took every recommendation above, this is what gets built

- **Separate Next.js app** at its own subdomain. Supabase Auth (same credentials as the mobile app). Mobile-first, shadcn.
- **Writes** → Django endpoint verifying the Supabase JWT → service-role write into Supabase `time_entries` / `sessions` / `session_attendees` with `capture_source = 'web'`. *(Or direct under RLS if you pick Q14b.)*
- **Flows**: login → today (clock state + recent sessions) → clock in (Geolocation, null-tolerant) → groups → new session (attendance, letters **or** blend categories, notes, live timer with backfill) → submit → clock out.
- **Draft persistence** in local storage; retry on reconnect. No service worker in v1.
- **Shared logic**: import `activeSessionState.js`, `sessionCaptureValidator.js`, `literacyConstants.js`, `localDate.js` from the mobile repo.
- **Out**: assessments, roster/grouping management, proxy capture, offline-first sync, Clerk.
- **One Supabase migration**: `capture_source` column. **One Supabase Auth config change**: web password-reset redirect.
- **Test matrix**: Huawei + low-storage Samsung + Chrome desktop.

Anything in that list you'd strike or add, write it here:

**Answer:**

---

## G. Pushback round — "where rows land is not a choice"

Your two concerns, and why I think both point *toward* Supabase as destination rather than away from it.

### G1. Blast radius on the mobile app

**Your concern:** the app is complicated and mid-bugfix; plugging a web client into its backend is a large new surface area; we might break it.

**Where the complexity actually lives:** the app's difficulty is its *local* sync engine — `sync_outbox_v2`, bundles, circuit breakers, ~50 SQLite tables, 156 KB outbox repository. The web client touches none of it. It writes server rows through the same RLS policies (`user_id = auth.uid()`) the app's own legacy PostgREST transport uses.

**The question that matters:** can the app's *pull* cope with a row it didn't create? It already must — every reinstall, handover transfer, or second-phone login bootstraps rows with no local history. Web rows look, to the app, like rows from a previous install. Well-trodden path.

**Where your instinct is right — row-shape drift:** if the app adds a key to `activities` or a NOT NULL column, a hand-built web row either fails to insert (safe) or inserts something the app mis-renders (unsafe). Structural fix, not carefulness:
1. Web client builds rows by calling the app's own `submitSessionDraft` (`activeSessionState.js`) and `sessionCaptureValidator.js` — same function, same shape, drift impossible by construction.
2. One contract test *in the app repo*: write a web-shaped row, run bootstrap pull, assert it renders. Runs in the app's CI, so the app team breaks the web client knowingly, not accidentally.

**A genuine new server-side surface:** abandoned web clock-ins. The app auto-clocks-out at 10h *on the phone*. A web clock-in needs a **server-side sweeper** (Render cron: open `time_entries` > 10h → `sign_out_time = sign_in_time + 10h, auto_clocked_out = true`). Note this also closes app entries orphaned by a dead/wiped phone — a gap that exists today. See Q27.

**Net:** blast radius is bounded to "row shape" and it's testable. The alternative (rows in Django) has an unbounded, permanent cost — see G2.

### G2. The larger Postgres universe

**Your concern:** Zazi iZandi is one programme; core youth/children data belongs in the org-wide Django Postgres; the frontend may rewire from Supabase RPCs to Django anyway. So why not write there now?

**The pattern this is:** two tiers, one direction of flow.
- **Operational store** (Supabase) — what field clients write to, closest to the capture moment, owns the write contract and RLS.
- **System of record / warehouse** (Django Postgres) — org-wide, multi-programme, fed by **ETL from the operational store**. This is exactly what `sync_teampact_sessions_2026` is today, with TeamPact as source. Swap the source to Supabase and you have the architecture you described.

Under that model, the rewiring you anticipate is on the **read side**: dashboards read Django instead of Supabase RPCs. **Capture writes still go to the operational store**, because that's the store all capture clients share.

**What goes wrong if web captures land in Django directly:** they become the only capture data that bypasses the operational store. The app can't see them (EA double-captures; history missing when they finally install); `/mobile-app/*` can't see them; the future ETL must special-case them. The only fix is a Django→Supabase push — **bidirectional sync between two Postgres databases**, the hardest problem in distributed data. The handover RPC is already a small taste of what that costs.

**This strengthens Q14(a):** put Django in the write path *now* (gatekeeper), so when the ETL/warehouse exists, Django already owns the write contract for web captures and can evolve it. What it does **not** mean is dual-writing to both databases in one request — that's the bidirectional-sync trap with a friendlier name. One writer per table; ETL for the rest.

**Mental model:** system-level CQRS. Commands go to the store nearest the field; queries for reporting come from the warehouse. The TeamPact era already worked this way; you're just swapping who's upstream.

### G3. The scenario where you'd be right

If the **mobile app itself** is ever going to move off Supabase onto Django as its operational store, then Supabase has an expiry date and the web client is built on sand. That's Q26.

---

❓ **Q26 — Is there any scenario where the mobile app moves off Supabase?** i.e. the app talks to Django (or a Django-fronted Postgres) as its operational store, and Supabase is retired? Or is Supabase the app's home for the foreseeable future, with Django as warehouse?

*Implication:* if "Supabase is home", destination is settled and G2 holds. If "we might move the app", then the web client should be built so its write path is an interface (Django gatekeeper, Q14a) and the *only* Supabase-specific code is on Django's side — which is Q14a anyway. Either way Q14a looks better.

➡️ My read from the repos: Supabase is home. Sixty-five migrations, nine SECURITY DEFINER RPCs, RLS as the security model — moving the app off it is a rewrite, not a rewire. But you know the roadmap.

**Answer:**

As far as I'm concenred, Supabase is home for now. There is a January 2027 scenario where I'm negotiating with the RSA government and they don't want PII data 'stored' outside of South Africa. So I might have to either encrypt it somehow and convince them that's okay or simply move to an AWS platform hosted in Cape Town. This is not my intention and I want to avoid it. It's 5 months out into the future.

---

❓ **Q27 — Server-side auto-clock-out sweeper.** Required for web clock-ins (no phone to close them). Who owns it: Django (Render cron, service-role write to `time_entries`) or a Supabase `pg_cron` job?

➡️ **Django Render cron.** It's where your other crons live, it's observable from `/mobile-app/*`, and it's a natural first Django→Supabase write in the funnel-through-Django direction. Also fixes orphaned app entries.

**Answer:**

Django Render cron is fine, I'm indifferent.

---

❓ **Q28 — ETL Supabase → Django.** Not in scope for this build, but it's the piece that makes G2 true.

**Verified — it's already in your own docs, as "Path A":** `zazi-izandi-app/documentation/historical-data-migration.md` (working draft, 2026-05-24), §3.2: *"pull mobile-captured data from Supabase into Render Postgres, mirroring the existing TeamPact ingestion pattern. Render remains the consolidator; Supabase remains mobile's source of truth."* §7.1 scopes it as one new Django sync command + one cron + a one-time roster seed. §6 specifies a `data_source` column on every row for dedup. §12 still has "[ ] Confirm Path A" unchecked. Zero code exists in the Django repo; the `teampact-supabase-seed` plan explicitly lists it as "separate workstream".

*So G2 isn't my architecture — it's yours, from May.* The web client just needs to not violate it: write to Supabase (mobile's source of truth), and Path A picks the rows up with everything else.

*Naming note so the two stamps don't get conflated later:* Path A's `data_source` (`'mobile'` | `'teampact'`) is a **warehouse-level** provenance — which upstream system. Q16's `capture_source` (`'mobile'` | `'web'`) is **operational-level** — which client wrote the row. A web-captured session is `capture_source='web'` in Supabase and `data_source='mobile'` once it lands in Render. Both are cheap; keep both.

*Remaining question for you:* is Path A still the intended direction, or has thinking moved since May?

**Answer:**

This is up in the air and not totally decided yet. Part of what I like about data in Django is we'll be incorporating a bunch of AI features in the future so I wanted that functionality side-by-side w/ the data for efficiency. But I'm not sure if those API calls are really any different if ti's Supabase PG vs our own hosted Postgres DB in same render instance.

---

## H. Round three — what your answers and the last explorer changed

### Settled by your answers (no further questions)
- Destination = Supabase app tables; **direct under RLS** (Q14b). Django stays out of the capture write path; Path A ETL is the read-side story.
- Separate Next.js app, Supabase Auth only, EA-only, no gating, `capture_source='web'`, clock-in gate on sessions, full session capture incl. Letter Tracker (Q18b), 7-day session backfill, live-first with backfill, draft persistence in v1, staff testers from day one, Huawei + low-storage Samsung in the matrix.
- GPS and timer: kept for parity, **not** load-bearing. Payroll tolerance accepted as "the tax of the backup."
- Q10 clarified: the website and every non-EA user stay on Clerk. Only the new EA app uses Supabase Auth.

### New facts from the grouping/onboarding explorer
1. **Protocol-v2 RPC envelope is fabricable from a browser.** Server enforces only: `actor_user_id = auth.uid()`, `mutation_id` uniqueness + hash stability, and per-`(stream, record)` generation monotonicity. There is **no stream registry**; `audit_seq` is only bounds-checked. A fresh `client_stream_id` per browser gets its own namespace, so `generation = 1` always accepts. **The real cost is the exact-key payload contracts** (CLASSES = exactly 7 keys; CHILDREN root = exactly 16 keys + ≥1 member; CLASS_GROUPING_STATE root = exactly 12 keys; three-layer per-group auth gate). Also: RPCs return `{kind, code}` JSONB for everything except the auth mismatch, which `RAISE`s — a web client must branch on `kind`, not HTTP status.
2. **Still directly insertable under RLS** (never revoked): `assessments`, `assessment_items`, `children` (`created_by = auth.uid()`), `child_class_memberships`, `child_group_memberships`, `grouping_versions`, `class_grouping_state`, plus the capture tables. **Only `classes` and `groups`** (and the ledgers / `staff_children`) genuinely need the RPCs. Caveat: a child inserted directly has no ledger row — the repo treats that as a defect state — so proper child creation is the bundle RPC anyway.
3. **Grouping**: the algorithm is pure (`src/utils/autoGrouping.js`, imports one JSON file); the orchestrator (`groupingService.js`, 2127 lines) is SQLite-bound. Inputs: per child, latest `assessments` row per type with `assessment_purpose='official_window'`, `assessment_window_id` in the year's baseline windows, and **only `correct_responses`** — `accuracy`, items, letters are never read. Requires `class_grouping_state.class_list_status='complete'`. There's an escape hatch that retro-stamps window-less, session-less progress-check assessments as baseline — but it only runs inside the app.
4. **Staff-side provisioning exists in embryo**: `scripts/seed-testflight.shared.js` has service-role helpers `createClass`, `createChild`, `recordLetterEgra`, `recordWordEgra`, `createGroupingVersion`, `createGroup`, `placeChildInGroup`, `setClassGroupingState`, and the sanctioned `seed_provision_assignment` RPC (service_role only) for ledger rows. Right shape, hardcoded test roster, `--only <tester>` already scopes to one EA. Django's `seedspec` is **not** reusable — one-shot cutover, manifest frozen 27 migrations behind head.
5. **Zero-build path**: the existing `/mobile-app/reassign` handover tool (Django → `transfer_assignment` RPC) moves `classes, groups, children, child_ea_assignments, child_class_memberships` between EAs. A coach with a working app can build a class, enter assessments, run grouping, and hand the lot to the EA.
6. **Shared logic**: all 11 pure modules are clean (only dep: `uuid`, and it's injectable — `crypto.randomUUID` works). `submitSessionDraft(state, {userId, saveSession, getLetterMastery, saveLetterMasteryRecord, updateLetterMasteryRecord, idFactory, …})` is fully dependency-injected; it builds the `sessions` row with nested `attendees` and hands it to `saveSession`. `buildAssessmentRecord` is pure. Seven 1:1 test files carry over. **No packaging in the mobile repo** (no `exports`, no workspaces); the one sharing precedent is a JSON data file read by both app and scripts.

---

❓ **H1 — The new-EA onboarding gap (most important open question).**
Your Q4 answer says assess → group is part of the *critical* workflow for a new cohort, and the 40 arriving in two weeks are new. v1 capture (sessions + clock) only helps an app-less EA **after** their roster and groups exist. Who builds them?

- (a) **Coach-with-app + handover** (zero build). Coach creates class + children in their own app, enters the EA's paper EGRA results, runs grouping, transfers via `/mobile-app/reassign`. Costs a coach ~30 min per EA; assessments carry the coach's `user_id`.
- (b) **Staff provisioning script** (~2–3 days). Adapt the seed helpers into `scripts/provision-ea-roster.js`: CSV in (EA email, class, grade, teacher, language, children) → classes, children, ledgers, memberships, `class_list_status='complete'`. Add `scripts/group-ea-class.js`: runs pure `assignGroups` on the EA's assessments, writes groups via service role. EA enters paper EGRA on web (H2). Two staff touchpoints, no RPC work on web.
- (c) **Full web onboarding** (~2 weeks beyond v1). Web implements class RPC, child-bundle RPC, assessment entry, grouping (pure algorithm + CLASS_GROUPING_STATE family payload). EA is fully self-sufficient without the app. Needed at Jan-2027 scale if ~200 app-less EAs can't be hand-provisioned.

➡️ **For the 40-cohort: (a), today, no code.** It's a process, and it tests whether coaches can absorb it. **Build (b) in weeks 2–3** as the scalable staff path — it's small and it's also what coaches need regardless. **Decide on (c) after the 40-cohort**, with real numbers on how many stay app-less past week 2. Don't build (c) speculatively; the payload contracts are exact-key and the app team is still changing them (`apply_mobile_class_mutation` was replaced on 2026-08-19).

**Answer:**

Yeah, I think a combination fo (a) and/or (b) if we're able to do it would work. Coach-with-app is hard than it looks b/c it takes basically all day to assess children. There's a world in which that's something we might want to do, send an experirenced EA who knows how to do it correctly to sit along side a new one, but it's quite a lot of logistical work and 100% not scalable or the long-term solution. So aiming for (b) where they capture everything, we process on backend (via some scripts), and then tell them when everything is provisioned properly is probably the way to go. That's actually how it works with Teampact right now.

---

❓ **H2 — Paper-EGRA entry on web (your Q9 compromise).** Now concrete: `assessments` is RLS-insertable, `buildAssessmentRecord` is pure, ~2 days. Form: pick child → letter set/language → **tick the letters the child got right** (grid, same order as the paper sheet) → submit. Writes `assessments` with `assessment_purpose='official_window'`, `assessment_window_id=<current baseline window>`, `capture_mode='paper_web'`, `correct_letters`/`incorrect_letters`/`correct_responses` computed.

Two sub-decisions:
- **Tick-the-letters vs count-only.** Count-only is faster to enter; tick-the-letters preserves `correct_letters` which feeds letter alignment and the Letter Tracker. Grouping only needs the count.
- **When.** v1.1 (week 2–3, alongside H1b) or later.

➡️ **Tick-the-letters; v1.1.** The marginal cost over count-only is one grid component you already need for the Letter Tracker, and the data is what your RCT analysts will want. Grade 1–3 word EGRA: same form with the 50-word set.

**Answer:**

**Tick-the-letters; v1.1

---

❓ **H3 — Offline depth: this is the real (a) vs (b) fork, and 25% offline forces it.**
- **Tier 1** — draft persistence + retry on reconnect. No service worker. **If the EA opens the URL with no signal, nothing loads.** Works only if the tab was loaded while online.
- **Tier 2** — service worker app shell (Serwist) + IndexedDB cache of roster/groups/mastery refreshed when online + **IndexedDB outbox** for clock-in/out, sessions, mastery: client UUIDs, client timestamps, FIFO submit on reconnect, idempotent via PK insert. No conflict resolution (web rows are always fresh inserts). Visible "N unsent" badge + manual retry. `navigator.storage.persist()` to resist eviction on low-storage phones.

*Implications:* Tier 2 is what makes "arrive at school offline, clock in, run a session, sync at home" work — which is the 25% case and the case where sessions are otherwise *lost*, not delayed. Cost ≈ 3–4 days on top of Tier 1, plus real device testing (SW support is fine on Chromium incl. Huawei Browser and iOS Safari; the risk is storage eviction, hence `persist()`). The app's top field complaint was sync failures — the web outbox must stay *boring*: one queue, no bundles, no retries ladder, a visible count, a retry button.

➡️ **Tier 1 for day-1 of the 40-cohort; Tier 2 by end of week 3.** If you'd rather hold launch for Tier 2, say so — it's a legitimate call given "sessions are very important."

**Answer:**

We can aim for this initially: **Tier 1 for day-1 of the 40-cohort; Tier 2 by end of week 3.**. If we were able to get to Tier 2 faster, that'd probably be ideal.

---

❓ **H4 — How the pure modules get shared.**
- (a) **Copy with checksum guard**: `zazi-izandi-web/shared/zz-core/` holds the 11 files + 7 tests, `scripts/sync-core.sh` copies from a pinned mobile commit, `UPSTREAM.md` records the SHA, CI fails if upstream files changed since the pin. Zero change to the mobile repo.
- (b) **Monorepo**: move web into the mobile repo as `apps/web`, extract `packages/core`. Cleanest, but restructures the mobile repo mid-bugfix (your G1 concern) and couples release cadences.
- (c) **Third package** `@zazi/core` in its own repo, both consume it. Clean, but the mobile repo must switch ~30 import sites, and you'd be publishing a private package.

➡️ **(a) now, (c) when the mobile app stabilises.** (a) is drift-*detected* not drift-*proof*, but the guard is mechanical and the mobile team sees a CI failure in the web repo, not a silent shape change. Pair it with the contract test in the app repo from G1.

**Answer:**

**(a) now, (c) when the mobile app stabilises.**

---

❓ **H5 — Auto-clock-out sweeper (Q27, still blank).** With Django out of the write path:
- (a) **`pg_cron` in Supabase**: one migration, `UPDATE time_entries SET sign_out_time = sign_in_time + interval '10 hours', auto_clocked_out = true WHERE sign_out_time IS NULL AND sign_in_time < now() - interval '10 hours'`. Lives in the app repo's migration chain.
- (b) **Django Render cron** with the service-role client.
- (c) **Client-side only**, like the app: web client closes its own stale entry on next load. Entries of EAs who never return stay open.

➡️ You answered Q27 "Django cron, indifferent" — so **(b) + (c)**: a Django management command on the existing Render cron, service-role update, plus client-side close-on-load. It also fixes app entries orphaned by dead phones. Settled unless you object.

**Answer:**
 You answered Q27 "Django cron, indifferent" — so **(b) + (c)**: a Django management command on the existing Render cron, service-role update, plus client-side close-on-load. It also fixes app entries orphaned by dead phones. Settled unless you object.
---

❓ **H6 — Geolocation policy on web.** App: permission *denied* blocks clock-in; *timeout* proceeds with nulls. On web, a denied permission is sticky per-site and hard for an EA to undo.

➡️ **Lenient**: request location; on denial or timeout proceed with nulls and a visible "clocked in without location" note. Consistent with your Q6 tolerance; avoids a support-ticket class.

**Answer:**

**Lenient**: request location; on denial or timeout proceed with nulls and a visible "clocked in without location" note. Consistent with your Q6 tolerance; avoids a support-ticket class.

---

❓ **H7 — Double-capture guard.** On session submit, if the EA already has a session for the same group on the same date (from their own rows, RLS-scoped), warn or block?

➡️ **Warn, don't block** — two sessions with one group in a day is legitimate. Show the existing one inline so they can compare.

**Answer:**

**Warn, don't block** — two sessions with one group in a day is legitimate. Show the existing one inline so they can compare.

---

❓ **H8 — Repo, domain, hosting.** Assumptions unless you object: new GitHub repo `zazi-izandi-web` (sibling of the other three locally), new Vercel project, `app.zazi-izandi.co.za`, Supabase Auth redirect allowlist gets the web reset URL. You hold Supabase dashboard + DNS access.

**Answer:**

**H8 — Repo, domain, hosting.** Assumptions unless you object: new GitHub repo `zazi-izandi-web` (sibling of the other three locally), new Vercel project, `app.zazi-izandi.co.za`, Supabase Auth redirect allowlist gets the web reset URL. You hold Supabase dashboard + DNS access.

---

### Q26 answered — Supabase is home, with a Jan-2027 data-residency risk
You flagged that the RSA government may require PII stored in South Africa. Two things worth knowing before that negotiation:
- **Supabase offers a Cape Town region (`af-south-1`)** — verify in the dashboard, but if so the residency problem is a project migration, not a platform change. That's a weekend with `pg_dump`/restore and a new project ref (the app pins `yaclyyurdwarhmiheojr` in `config/supabaseProjectConfig.js`, so it's an app release too). Far cheaper than AWS-from-scratch.
- **Implication for the web client:** keep every Supabase-specific call behind one thin module (`lib/data/*` — auth, reads, writes). If the store ever moves, that module is the blast radius. This is good hygiene anyway and costs nothing now.

### Q28 answered — Path A undecided; AI features "side-by-side with data"
Your question — *is a Django AI feature any different querying Supabase PG vs Render PG?* — has a concrete answer:
- **Latency**: Render Frankfurt → Supabase eu-west-1 (Ireland) is ~20–30 ms per query. An LLM call is 2–20 *seconds*. Co-location is irrelevant to AI-feature performance; it matters only for chatty per-row ORM patterns, which you'd avoid anyway.
- **Ergonomics — the option you may not have considered**: Django can point a **second `DATABASES` alias at Supabase Postgres directly** (read-only role, via the Supavisor pooler), with `managed = False` models mirroring the app tables. No ETL, no duplication, AI features and reports query *live* capture data with the ORM. "Path A-lite." Trade-offs: Django couples to the app's schema (mitigated by only mirroring the stable tables), and cross-region latency on heavy aggregations (mitigated by materialising summaries in Render, which you already do for TeamPact).
- Path A (copy) vs Path A-lite (read-through) is a real decision, but **not this build's**. Nothing in the web client changes either way.

**Answer (optional):**

---

### What I'll do once you've answered H1–H8
Write the implementation plan: v1.0 (two weeks, online + Tier 1, capture only), v1.1 (weeks 2–3: Tier 2 offline, paper-EGRA entry, provisioning scripts), and a decision gate for full web onboarding after the 40-cohort. Task-level, with the files to create, the modules to import, the one Supabase migration, the test matrix, and the contract test in the app repo.
