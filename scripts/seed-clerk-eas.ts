/**
 * Bulk-create Clerk users for active 2026 EAs so they can sign in to /my-kids/today.
 *
 * Two input modes:
 *   1. Django roster (default): GET /api/ea-roster/ — Django is authoritative,
 *      pre-joined to TeamPact email/name. Requires `import_teampact_users` to
 *      have been run on the Django side (see scripts/README.md).
 *   2. Direct CSV (--input-csv path/to.csv): bypass Django and read everything
 *      from a CSV with columns `email_address, teampact_user_id,
 *      teampact_user_name, first_name?, last_name?`. Use this when the Django
 *      roster doesn't have emails yet.
 *
 * Sign-in flow: passwordless email-code. Clerk users are created with
 * skipPasswordRequirement=true; on first sign-in Clerk emails a 6-digit code,
 * verifies the email, and signs them in. No password to distribute.
 *
 * Idempotent: existing Clerk users with the same email are skipped (or have
 * their EA metadata refreshed via --update-metadata, spreading existing
 * publicMetadata so no other fields are wiped).
 *
 * Usage:
 *   npm run seed:eas -- --dry-run --limit 5
 *   npm run seed:eas -- --input-csv path/to/eas.csv
 *   npm run seed:eas -- --emails-file path/to/emails.csv      # filter Django roster
 *   npm run seed:eas -- --update-metadata
 *   npm run seed:eas -- --yes-prod                            # required for sk_live_ keys
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
// .env.local takes precedence over .env (matches Next.js convention)
loadEnv({ path: '.env.local', override: true })

import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { createClerkClient } from '@clerk/backend'
import { parse as parseCsv } from 'csv-parse/sync'
import { djangoFetch } from '../lib/django-fetch'

interface RosterRow {
  teampact_user_id: number
  teampact_user_name: string
  email: string
  first_name: string
  last_name: string
}

interface RosterResponse {
  roster: RosterRow[]
  dropped: { teampact_user_id: number; teampact_user_name: string; reason: string }[]
  counts: { returned: number; dropped: number }
}

type Status = 'created' | 'updated' | 'skip:exists' | 'skip:dry-run' | 'error'

interface ReportRow {
  email: string
  status: Status
  clerk_id: string
  teampact_user_id: number | string
  error: string
}

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    'input-csv': { type: 'string' },
    'emails-file': { type: 'string' },
    'update-metadata': { type: 'boolean', default: false },
    limit: { type: 'string' },
    'yes-prod': { type: 'boolean', default: false },
  },
})

const isDryRun = !!args['dry-run']
const updateMetadata = !!args['update-metadata']
const limit = args.limit ? Number(args.limit) : undefined
const yesProd = !!args['yes-prod']
const emailsFilePath = args['emails-file'] as string | undefined
const inputCsvPath = args['input-csv'] as string | undefined

function abort(msg: string): never {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

const clerkSecretKey = process.env.CLERK_SECRET_KEY
if (!clerkSecretKey) abort('CLERK_SECRET_KEY is not set in .env.local')

const isProdKey = clerkSecretKey.startsWith('sk_live_')
const envLabel = isProdKey ? 'PRODUCTION (sk_live_*)' : 'development (sk_test_*)'

console.log('━'.repeat(60))
console.log(`Clerk environment : ${envLabel}`)
console.log(`Mode              : ${isDryRun ? 'DRY-RUN (no writes)' : 'WRITE'}`)
console.log(`Source            : ${inputCsvPath ? `CSV (${inputCsvPath})` : 'Django /api/ea-roster/'}`)
console.log(`Update metadata   : ${updateMetadata}`)
if (limit) console.log(`Limit             : ${limit}`)
if (emailsFilePath) console.log(`Email filter file : ${emailsFilePath}`)
console.log('━'.repeat(60))

if (isProdKey && !isDryRun && !yesProd) {
  abort(
    'Refusing to write against PRODUCTION Clerk without --yes-prod. ' +
      'Re-run with --dry-run first, then add --yes-prod to confirm.',
  )
}

let emailFilter: Set<string> | null = null
if (emailsFilePath) {
  const csv = fs.readFileSync(emailsFilePath, 'utf-8')
  const rows = parseCsv(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    string
  >[]
  emailFilter = new Set(
    rows
      .map((r) => (r.email_address || r.email || '').trim().toLowerCase())
      .filter(Boolean),
  )
  console.log(`Loaded ${emailFilter.size} email(s) from filter file\n`)
}

async function fetchRoster(): Promise<RosterResponse> {
  const res = await djangoFetch('/api/ea-roster/')
  if (!res.ok) {
    throw new Error(`Django /api/ea-roster/ returned ${res.status}: ${await res.text()}`)
  }
  return res.json() as Promise<RosterResponse>
}

function loadFromCsv(filePath: string): RosterResponse {
  const csv = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCsv(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[]
  if (rows.length === 0) {
    throw new Error(`CSV at ${filePath} is empty or has no header row`)
  }
  const required = ['email_address', 'teampact_user_id', 'teampact_user_name']
  const missing = required.filter((c) => !(c in rows[0]))
  if (missing.length) {
    throw new Error(
      `CSV missing required columns: ${missing.join(', ')}. ` +
        `Expected: email_address, teampact_user_id, teampact_user_name [, first_name, last_name]`,
    )
  }
  const roster: RosterRow[] = []
  const dropped: { teampact_user_id: number; teampact_user_name: string; reason: string }[] = []
  for (const row of rows) {
    const email = (row.email_address || '').trim()
    const idRaw = (row.teampact_user_id || '').trim()
    const name = (row.teampact_user_name || '').trim()
    if (!email || !idRaw || !name) {
      dropped.push({
        teampact_user_id: Number(idRaw) || 0,
        teampact_user_name: name || '(unknown)',
        reason: 'missing_required_field',
      })
      continue
    }
    const id = Number(idRaw)
    if (!Number.isFinite(id)) {
      dropped.push({
        teampact_user_id: 0,
        teampact_user_name: name,
        reason: `invalid_id:${idRaw}`,
      })
      continue
    }
    roster.push({
      teampact_user_id: id,
      teampact_user_name: name,
      email,
      first_name: (row.first_name || '').trim(),
      last_name: (row.last_name || '').trim(),
    })
  }
  return { roster, dropped, counts: { returned: roster.length, dropped: dropped.length } }
}

async function main() {
  const data = inputCsvPath ? loadFromCsv(inputCsvPath) : await fetchRoster()
  const sourceLabel = inputCsvPath ? 'CSV' : 'Django roster   '
  console.log(
    `${sourceLabel}: ${data.counts.returned} eligible, ${data.counts.dropped} dropped\n`,
  )

  if (!inputCsvPath && data.counts.returned === 0 && data.counts.dropped > 0) {
    console.log(
      `⚠ Django returned 0 eligible EAs because none have an email on file in the\n` +
        `  EducationAssistant model. To populate it, in the Django repo run:\n` +
        `    python manage.py import_teampact_users path/to/teampact-users.csv\n` +
        `  (CSV exports come from TeamPact's user export — see scripts/README.md.)\n` +
        `  Or bypass Django entirely with: npm run seed:eas -- --input-csv your.csv\n`,
    )
  }

  let roster = data.roster
  if (emailFilter) {
    const before = roster.length
    roster = roster.filter((r) => emailFilter!.has(r.email.toLowerCase()))
    const missing = [...emailFilter].filter(
      (e) => !data.roster.some((r) => r.email.toLowerCase() === e),
    )
    console.log(`After email filter: ${roster.length} (filtered out ${before - roster.length})`)
    if (missing.length) {
      console.log(`  ⚠ ${missing.length} email(s) in filter were NOT in Django roster:`)
      missing.forEach((e) => console.log(`    - ${e}`))
    }
    console.log()
  }

  if (limit && roster.length > limit) {
    console.log(`Capping to first ${limit} (--limit)\n`)
    roster = roster.slice(0, limit)
  }

  if (data.dropped.length) {
    console.log(`⚠ ${data.dropped.length} active EA(s) have no email on file in Django:`)
    data.dropped.forEach((d) => {
      console.log(`    - ${d.teampact_user_name} (id=${d.teampact_user_id})`)
    })
    console.log('  These need manual entry in the Clerk Dashboard.\n')
  }

  if (roster.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const clerkClient = createClerkClient({ secretKey: clerkSecretKey! })
  const reportRows: ReportRow[] = []

  for (let i = 0; i < roster.length; i++) {
    const ea = roster[i]
    const prefix = `[${i + 1}/${roster.length}]`
    try {
      const existing = await clerkClient.users.getUserList({
        emailAddress: [ea.email],
        limit: 1,
      })

      if (existing.data.length > 0) {
        const user = existing.data[0]
        if (!updateMetadata) {
          console.log(`${prefix} ${ea.email} → skip (exists, ${user.id})`)
          reportRows.push({
            email: ea.email,
            status: 'skip:exists',
            clerk_id: user.id,
            teampact_user_id: ea.teampact_user_id,
            error: '',
          })
        } else if (isDryRun) {
          console.log(`${prefix} ${ea.email} → would-update (${user.id})`)
          reportRows.push({
            email: ea.email,
            status: 'skip:dry-run',
            clerk_id: user.id,
            teampact_user_id: ea.teampact_user_id,
            error: '',
          })
        } else {
          await clerkClient.users.updateUser(user.id, {
            publicMetadata: {
              ...user.publicMetadata,
              role: 'ea',
              teampact_user_id: ea.teampact_user_id,
              teampact_user_name: ea.teampact_user_name,
            },
          })
          console.log(`${prefix} ${ea.email} → updated metadata (${user.id})`)
          reportRows.push({
            email: ea.email,
            status: 'updated',
            clerk_id: user.id,
            teampact_user_id: ea.teampact_user_id,
            error: '',
          })
        }
      } else if (isDryRun) {
        console.log(`${prefix} ${ea.email} → would-create`)
        reportRows.push({
          email: ea.email,
          status: 'skip:dry-run',
          clerk_id: '',
          teampact_user_id: ea.teampact_user_id,
          error: '',
        })
      } else {
        const created = await clerkClient.users.createUser({
          emailAddress: [ea.email],
          firstName: ea.first_name || undefined,
          lastName: ea.last_name || undefined,
          publicMetadata: {
            role: 'ea',
            teampact_user_id: ea.teampact_user_id,
            teampact_user_name: ea.teampact_user_name,
          },
          skipPasswordRequirement: true,
        })
        console.log(`${prefix} ${ea.email} → created (${created.id})`)
        reportRows.push({
          email: ea.email,
          status: 'created',
          clerk_id: created.id,
          teampact_user_id: ea.teampact_user_id,
          error: '',
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`${prefix} ${ea.email} → ERROR: ${message}`)
      reportRows.push({
        email: ea.email,
        status: 'error',
        clerk_id: '',
        teampact_user_id: ea.teampact_user_id,
        error: message,
      })
    }
    // 5 req/s — well under Clerk's 1000/10s production limit
    await new Promise((r) => setTimeout(r, 200))
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const reportDir = path.resolve(process.cwd(), 'scripts/seed-reports')
  fs.mkdirSync(reportDir, { recursive: true })
  const reportPath = path.join(reportDir, `seed-eas-${ts}.csv`)
  const csv = [
    'email,status,clerk_id,teampact_user_id,error',
    ...reportRows.map((r) =>
      [r.email, r.status, r.clerk_id, r.teampact_user_id, JSON.stringify(r.error)].join(','),
    ),
  ].join('\n')
  fs.writeFileSync(reportPath, csv)

  const counts = reportRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  console.log('\n' + '━'.repeat(60))
  console.log('Summary:', counts)
  console.log(`Report : ${reportPath}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
