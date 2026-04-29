# Clerk User Setup

> Practical guide for adding Education Assistants (EAs) and test users to Clerk so they can access `/my-kids`. Covers both the quick manual path (for testing) and bulk import (for real rollout).

## Who reads this

- **Programme managers** setting up real EA accounts
- **Anyone testing** the `/my-kids` experience before it ships
- **Developers** running local or production smoke tests

## Prerequisites

Before adding any users:

1. **Clerk Dashboard access** — log in at https://dashboard.clerk.com and select the Zazi iZandi application.
2. **Custom session claim configured** — Clerk Dashboard → Configure → Sessions → Customize session token. The JSON must include:
   ```json
   {
     "metadata": "{{user.public_metadata}}"
   }
   ```
   This is what makes `sessionClaims.metadata.role` readable by the Next.js middleware. Without it, every EA login will be redirected to `/` instead of `/my-kids`. (This should already be set from Phase 0 — verify before creating users.)

---

## Quick start: Phase 1A test users (5 min, manual)

Phase 1A needs two test users to exercise every auth path. Create both now — they'll unblock manual smoke testing (Task 11) and let you view the site on mobile as a real user.

### 1. Linked test EA (simulates a real user)

This is the "view as a real EA" account. When you log in with it, `/my-kids` will render the same experience a real EA sees — currently a stub in Phase 1A, real groups in Phase 1B.

1. **Clerk Dashboard** → **Users** → **Create user**
2. **Email:** use any address you control. Gmail `+test` aliases work well (e.g. `youraddress+zz-test-ea@gmail.com` — Gmail ignores the `+...` suffix so mail still lands in your inbox).
3. **Set a password** (or use Clerk's passwordless email code flow — whichever is easier on your phone).
4. After the user is created, open their profile and scroll to **Public metadata**. Click **Edit** and paste:

   ```json
   {
     "role": "ea",
     "teampact_user_id": 28739,
     "teampact_user_name": "Shadey Africander"
   }
   ```

   **Why Shadey (28739)?** This is a known-good EA in the 2026 data — verified during Phase 0 to return real groups, children, and sessions from the Django API. When Phase 1B lands, this account will automatically render Shadey's actual data on `/my-kids` with no reconfiguration.

5. **Save**.
6. **Record the credentials** somewhere private (a password manager entry labelled *"ZZ Phase 1A test — linked EA"*). You'll reuse this account for every future phase.

### 2. Not-linked EA (exercises the edge state)

This account has the `ea` role but no TeamPact link, so it triggers the `NotLinkedState` edge case.

1. **Clerk Dashboard** → **Users** → **Create user**
2. Use a **different** email from test user #1 (another `+test` alias is fine).
3. Set a password or use email code.
4. In **Public metadata**, paste:

   ```json
   {
     "role": "ea"
   }
   ```

   Note: **no** `teampact_user_id`. That's the whole point.

5. **Save** and record credentials as *"ZZ Phase 1A test — not-linked EA"*.

---

## Mobile testing flow

Once both test users exist, you can exercise the whole Phase 1A auth chain from a phone:

1. On your phone, open `https://zazi-izandi.co.za/my-kids` (or `http://localhost:3000/my-kids` against a local dev server).
2. Expected: redirect to `/login?redirect_url=%2Fmy-kids`.
3. Sign in as the **linked** test EA.
4. Expected: land on `/my-kids`. The top bar shows *"Shadey Africander"* with the Zazi iZandi logo and a `<UserButton>` avatar. The body shows the Phase 1A stub placeholder (*"My Groups — Your groups will appear here shortly"*).
5. Tap the `<UserButton>` → **Sign out**. You land on `/`.
6. Sign in as the **not-linked** test EA.
7. Expected: land on `/my-kids`. The top bar shows *"Welcome"* (no TeamPact name to display). The body shows the `NotLinkedState` edge state: amber link icon, *"Your account isn't linked to your teaching profile yet"*, and a **Contact team** mailto link.
8. Deep-link test: while signed out, visit `https://zazi-izandi.co.za/my-kids/groups/67610?tab=sessions`. Expected: redirect to `/login?redirect_url=%2Fmy-kids%2Fgroups%2F67610%3Ftab%3Dsessions`. Sign in as the linked EA — you should land on `/my-kids/groups/67610?tab=sessions` (which in Phase 1A will 404 because the group detail page isn't built yet; that's expected and proves `redirect_url` with query strings is preserved end-to-end).

Phase 1B will replace the stub body on `/my-kids` with real group cards fetched from the Django API. Phase 1C will build the group detail page at `/my-kids/groups/[class_id]` so the deep-link scenario stops 404'ing.

---

## Bulk import for real EAs (when Phase 1 ships)

**Clerk does NOT have a native CSV upload feature in the Dashboard.** For any number of EAs, the canonical approach is to use the [Clerk Backend API](https://clerk.com/docs/reference/backend-api) — either `POST /v1/users` to create users directly, or `POST /v1/invitations` to send email invitations. A CSV is useful as *input* to a script, not as a Dashboard file upload.

### When to use which approach

| EA count | Approach |
|---|---|
| **1–10** | Manual Dashboard entry (repeat the linked-EA steps above) |
| **10+** | Script via Backend API (see below) |

Our 2026 programme has roughly 50–200 active EAs, so bulk is the practical path when we're ready to open the gates.

### CSV schema

Whichever script you use, the input CSV should have these columns (header row required):

| Column | Required | Source | Example |
|---|---|---|---|
| `email_address` | yes | TeamPact `/users` endpoint — `user.email` | `asemahlemancayi@gmail.com` |
| `first_name` | recommended | TeamPact `user.firstname` | `Asemahle` |
| `last_name` | recommended | TeamPact `user.lastname` | `Mancayi` |
| `teampact_user_id` | **yes** | TeamPact `user.id` (integer) | `28764` |
| `teampact_user_name` | **yes** | TeamPact `user.name` (full display name) | `Asemahle Mancayi` |

`teampact_user_id` is the scoping key that the `/api/ea/<user_id>/` endpoint uses. `teampact_user_name` is what renders in the top bar. The `first_name` and `last_name` are Clerk's own user profile fields (shown in `<UserButton>`, sign-in flows, etc.) and are nice-to-have but not load-bearing for our data scoping.

### Use the seed script

A working passwordless seed script lives at [`scripts/seed-clerk-eas.ts`](../scripts/seed-clerk-eas.ts) — see [`scripts/README.md`](../scripts/README.md) for full usage. Quick reference:

```bash
# In this Next.js repo, with .env.local set up:

# Preview only (no writes)
npm run seed:eas -- --dry-run --limit 5

# Real run, sourced from Django roster
npm run seed:eas

# Or bypass Django and feed a CSV directly
npm run seed:eas -- --input-csv path/to/eas.csv
```

The script creates Clerk users with `skipPasswordRequirement: true` so EAs sign in passwordless via the **Email verification code** strategy — no credentials to distribute. It's idempotent (re-running skips users that already exist), rate-limited, and writes a report CSV per run to `scripts/seed-reports/`.

For the script to find emails when sourcing from Django, the EA roster on the Django side first needs `import_teampact_users` to have been run with the TeamPact dashboard's user export CSV. The script will print a friendly nudge if the roster comes back without emails.

### Rate limits to be aware of

From Clerk's documented limits:

- **Direct user creation (what we use):** 1000 requests / 10 seconds — effectively unlimited at our scale.
- **Bulk invitations** (not used by this script): 25 / hour. We chose direct creation specifically to avoid this bottleneck.

---

## Alternative: EA verification via email code (passwordless)

If you want to skip password management entirely, Clerk supports email code sign-in (also called email OTP). The EA enters their email, Clerk sends a 6-digit code, they enter it, they're signed in. No password required. This is ideal for mobile-first users who don't want to manage credentials.

Configuration:

1. **Clerk Dashboard** → **User & Authentication** → **Email, Phone, Username**
2. Ensure **Email address** is on and set as a **Required** identifier
3. Under **Authentication strategies**, enable **Email verification code** (and disable password if you want a purely passwordless flow)

This means the test user flow above also works passwordless — when creating a test user in Dashboard, you don't have to set a password at all; on first sign-in, Clerk will email them a code.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| EA signs in but lands on `/` instead of `/my-kids` | Session token custom claim missing `metadata` | Clerk Dashboard → Configure → Sessions → Customize session token → add `{ "metadata": "{{user.public_metadata}}" }` |
| EA lands on `/my-kids` but sees *"Your account isn't linked…"* | `publicMetadata.teampact_user_id` is missing from the user | Clerk Dashboard → Users → select user → Public metadata → add `teampact_user_id: <number>` |
| Top bar says *"Welcome"* instead of the EA's name | `teampact_user_name` is missing from `publicMetadata` | Add it to the user's Public metadata |
| EA sees the page but no groups (Phase 1B+) | Their `teampact_user_id` doesn't match any `ea_user_id` in `GroupSummary2026` | Run `python manage.py validate_ea_data_2026` in the Django repo to check for stale IDs and regroupings |
| Sign-in loops back to `/login?error=insufficient_role` | The user has a role but not `ea` or above | Set `role: "ea"` in `publicMetadata` |

---

## Related reading

- [documentation/letter-mastery-data-model.md](letter-mastery-data-model.md) — important context on what data the `/my-kids` pages actually show
- [docs/superpowers/specs/2026-04-09-ea-my-kids-design.md](../docs/superpowers/specs/2026-04-09-ea-my-kids-design.md) — full feature design spec
- [docs/superpowers/plans/2026-04-10-ea-my-kids-phase1a.md](../docs/superpowers/plans/2026-04-10-ea-my-kids-phase1a.md) — Phase 1A implementation plan (where Task 10 references this doc)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [Clerk Backend API reference](https://clerk.com/docs/reference/backend-api)
