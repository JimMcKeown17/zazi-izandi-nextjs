## Project Management
- Let's run a deep analysis on tracking some 'change over time' stuff. Such as people moving from low to high sessions. red to green. or along the scatter plot correctly. This type of project management is super next level.

## Overall Design
- I think we need to move the filter from the overview tab over to the sidebar so it's possible to change on the different sidebar pages.

## AI
- Build AI into the my-kids pages for EAs. Use Vercel AI SDK. Iterate many times.

## Teachers
- Add a teacher page where they can see their kids performance

## Schools
- Add a schools overview page where a principal can see their kids & classrooms's performance

## Info Page
- Add a page with descriptions/explanations of the different ways we're thinking about and viewing the data.

## Other Features
- Add an export or list of kids that were assessed but are not receiving sessions (from Teatment or SEF schools)
- Blending page
- Page for EAs with 2 classrooms.
- Badges for EAs


## Mentor Page
- Update to pull from newest Mentor Visit API and add to old one. Will require a model migration to add the two new columns
- On mentor visits page, it's not calculating coverage gap correctly b/c of school names.
- Consider adding in Stan's excel sheet and put that alongside our current calculated info on the LCs

## My-Kids Page
- Add horizontal bar chart showing sessions per group
- Consider showing Alignment Stat, session rank vs other EAs (Or something like a cohort - congrats, you've done more sessions than 73% of your peers type of thing), some badge/leaderboard stuff.

## Bugs & Checks
- I have letter orders in 2 places: lib/pm/constants.ts (line 54). and api/letter_constants.py. I should probably only store these in the backend and replace any code pulling them from the frontend.
- Figure out the correct letter orders we should be using.
- Make sure no schools are being thrown off by school holidays.
- See which pages I need to delete the blending groups from, such as the letter alignment calculations.
- Figure out Busisiwe Kampeni (Teampact UserID: 28755) and why she's showing so many sessions for March 18.
- Kampeni appears to be working in more than 1 school. Same with Yonela Lewu. I need to figure out how to deal with that.
- **Multi-group alignment data bug** (flagged during Phase 1C review, deferred): `ChildLetterAlignment2026` uses `participant_id` as the primary key, so each child can have exactly one alignment row. The nightly `compute_letter_alignment_2026` assigns `pid_to_group[pid] = group_key` unconditionally as it iterates session rows — for multi-group children (kids who attend sessions across two groups/EAs), only the LAST group seen wins. The losing group silently loses that child's alignment data (coaching tips, per-child badges, mastery percentages). Impact: ~<5% of kids are multi-group (Kampeni's and Yonela Lewu's cohorts are the main affected groups, tying in with the item above). Shadey Africander's groups are unaffected. Fix requires a schema migration on `ChildLetterAlignment2026` (composite PK or autoincrement ID), refactor of `compute_letter_alignment_2026.py` to build per-group rows, and updates to `ea_mastery.py` and `ea_group_detail` view queries to handle multiple rows per participant. Estimate: 1–2 days of focused backend work. Should also add an integration test that exercises the multi-group scenario via the actual compute command (current tests create `ChildLetterAlignment2026` rows directly, bypassing the bug).
- **PMSidebar Clerk UserButton hydration warning** (dev-mode only, deferred): the `<UserButton>` in `components/pm/layout/pm-sidebar.tsx:125` sometimes throws a React hydration mismatch on first navigation to a `/pm/*` route after a cold dev-server start. The mismatch is between Clerk's SSR placeholder `<div data-clerk-component="UserButton">` and the sibling `<span>Account</span>`. React marks it "Recoverable Error" and regenerates the subtree on the client, so behavior is unaffected and a refresh clears it. Does NOT reproduce in production (routes are pre-compiled and Clerk session state is resolved consistently). Fix options if it ever matters: (1) wrap the UserButton in `<Suspense fallback={null}>`, or (2) use `next/dynamic` with `ssr: false` to skip SSR entirely for the button. Option 1 is the minimal fix.

