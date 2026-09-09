# Staff password recovery on an existing EA profile

Local implementation, September 8, 2026. This is the reviewed Slice 0 recovery
entrypoint, not account creation, invitation orchestration or retirement.

The EA profile at `/mobile-app/users/<user UUID>` can show a **Password reset**
panel to an authenticated `admin` or `zz_data_manager`. The page requires its
resolved profile UUID to match the requested UUID. The server action independently
requires `mobile.accounts.recover`, obtains the actual current Clerk session token
and forwards only the canonical target/operation UUIDs to Django's existing
`/api/mobile/accounts/password-setup/request/` endpoint. Django independently
verifies the signed session and capability. No client-selected actor, email or
password is accepted.

## Controlled rollout

`ZZ_PASSWORD_RECOVERY_SCOPE` is server-only and defaults to disabled:

- Unset, `disabled`, or any invalid value: hide the panel and refuse the action.
- One canonical lowercase UUID: permit only that exact controlled account.
- `all`: permit the reviewed general rollout, still subject to both capability
  checks. Do not configure this before the controlled hosted journey passes.

No scope value was configured or deployed by this local build. Before the first
hosted test, prepare the approved synthetic account through the legacy authority
guard and verify its test marker, exact UUID and empty programme graph. Configure
only that UUID, deploy the reviewed Next source, and use the tester's ordinary
Clerk-authenticated browser. Do not manufacture a staff bearer from a service key
or write synthetic Clerk provenance into a hosted password operation.

## Request and delivery behavior

The manager explicitly confirms a send. There is no request on mounting, loading
a profile or navigating. The component binds the operation UUID to the captured
account UUID. An uncertain request can be checked again using that same pair;
Django's existing replay contract does not send a second message for an existing
operation. A deliberate replacement confirmation creates a new operation UUID
and supersedes earlier unfinished attempts. Reloading the page discards component
state; any new send still requires explicit confirmation that it replaces prior
unused links.

Only the exact operation-bound `mail_accepted` response is shown as SMTP acceptance.
It does not prove inbox delivery, password change or mobile login. Unknown transport,
malformed/oversized responses and ambiguous backend outcomes remain unconfirmed.
The panel never displays a provider body, password, generated link or recipient
bearer. Account navigation resets the attempt scope; late responses after unmount
cannot change a different profile.

The panel uses an explicit region wrapper consistent with existing profile cards.
A generic `section` inherited the site's large section padding during the visual
check; the corrected wrapper preserves the accessible heading without that spacing.

## Verification boundaries

`npm run test:password-recovery` exercises the compiled server action with
controlled authentication/HTTP boundaries, the rendered profile with the real
capability map, and the actual React component in Chromium with external requests
blocked. It covers forbidden roles, missing token, exact input/response binding,
default-off and exact-canary rollout, duplicate clicks, response loss/retry,
replacement, navigation, unmount and Strict Mode. These tests send no email.

Actual Clerk-authenticated Server Action transport, hosted SMTP/inbox delivery,
redemption/password completion and ordinary installed-mobile login remain separate
controlled checks. This surface creates a recovery operation for an existing
account only; it does not prove the future provisioning saga or registry activation.
