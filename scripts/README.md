# scripts/

Operational scripts that don't run in the Next.js app at request time. Currently
just one script.

## seed-clerk-eas.ts

Bulk-create Clerk users for active 2026 Education Assistants so they can sign in
to `/my-kids/today`. Each user is created passwordless (email-code sign-in) with
the publicMetadata shape that the EA dashboards expect:

```json
{ "role": "ea", "teampact_user_id": 28739, "teampact_user_name": "Shadey Africander" }
```

### Prerequisites (one-time)

1. **Clerk Dashboard → User & Authentication → Email, Phone, Username**:
   `Email address` required, `Email verification code` enabled. Password may stay
   on or off — `skipPasswordRequirement` on each created user lets them sign in
   code-only regardless.
2. **Clerk Dashboard → Configure → Sessions → Customize session token** must
   include `"metadata": "{{user.public_metadata}}"`. Without this, the
   middleware can't read `role` and EAs land on `/` instead of `/my-kids/today`.
3. `.env.local` has `CLERK_SECRET_KEY`, `DJANGO_API_URL`, `INTERNAL_API_SECRET`.

### Two input modes

#### A. Django roster (recommended for ongoing use)

Source of truth: `GET /api/ea-roster/` on the Django backend. The endpoint joins
`EducationAssistant` (the canonical roster, kept in sync nightly from sessions)
with TeamPact email/name fields populated by `import_teampact_users`.

To populate the email column the first time, in the Django repo:

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python manage.py import_teampact_users path/to/teampact-users.csv
```

The CSV must have headers `ID, Name, Email, First Name, Last Name, Roles` —
this matches the TeamPact dashboard's user export verbatim. Existing rows are
updated in place; rows whose `ID` isn't already in `EducationAssistant` are
ignored (they get added later by `backfill_education_assistants`).

Once that's done:

```bash
npm run seed:eas -- --dry-run --limit 5     # preview
npm run seed:eas                            # for real
```

#### B. Direct CSV (bypasses Django)

If you have a curated email list and don't want to round-trip through Django:

```bash
npm run seed:eas -- --input-csv path/to/eas.csv
```

CSV columns (header row required): `email_address, teampact_user_id, teampact_user_name, first_name, last_name`. The last two are optional.

### All flags

| Flag | Purpose |
|---|---|
| `--dry-run` | Plan only, no Clerk writes. Always run this first. |
| `--input-csv <path>` | Read EAs from a CSV (mode B above). Skips Django entirely. |
| `--emails-file <path>` | Filter Django roster to a curated email list (single column `email_address`). |
| `--update-metadata` | When an EA's email already exists in Clerk, refresh their `publicMetadata` (spreads existing fields so nothing else gets wiped). |
| `--limit N` | Cap to first N rows. Useful for staged rollouts. |
| `--yes-prod` | Required when `CLERK_SECRET_KEY` is a `sk_live_*` key. The script aborts otherwise. |

### Behaviour notes

- **Idempotent.** Re-running the same input is safe: existing Clerk users get `skip:exists`.
- **Rate-limited.** 5 req/s — well under Clerk's prod limit of 1000/10s.
- **Reports.** Every run writes `scripts/seed-reports/seed-eas-<ISO>.csv` with one row per EA and a `status` of `created`, `updated`, `skip:exists`, `skip:dry-run`, or `error` plus the Clerk ID. The directory is gitignored.
- **Verified emails out of the gate.** Clerk auto-verifies the email when you create a user with `skipPasswordRequirement: true`, so the EA can sign in immediately via email-code.
- **Refusing prod by default.** If `CLERK_SECRET_KEY` starts with `sk_live_`, write mode requires `--yes-prod` to proceed. Dry-runs always work.
