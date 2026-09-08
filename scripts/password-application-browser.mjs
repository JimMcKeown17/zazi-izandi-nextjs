// Standalone browser leg of the disposable application harness. Receives only
// ephemeral local test inputs on stdin; emits named checks, never secret values.
import { chromium } from '@playwright/test';

let raw = '';
for await (const chunk of process.stdin) {
  raw += chunk;
  if (raw.length > 16384) process.exit(2);
}
let browser;
let stage = 'preflight';
const checks = [];
const statuses = [];
function check(name, condition) {
  if (!condition) throw new Error('check_failed');
  checks.push(name);
}
try {
  const input = JSON.parse(raw);
  raw = '';
  check('known_browser_case', ['success', 'weak_retry', 'provider_loss', 'browser_loss', 'invite'].includes(input.mode));
  const origin = new URL(input.origin);
  const link = new URL(input.link);
  check('exact_local_browser_target', origin.protocol === 'http:' && origin.hostname === 'localhost' && Number(origin.port) >= 1024 && origin.pathname === '/' && !origin.username && !origin.password && !origin.search && !origin.hash);
  check('exact_application_mail_url', link.origin === 'https://www.zazi-izandi.co.za' && link.pathname === '/ea-set-password' && !link.search);
  const destination = origin.origin + link.pathname + link.hash;
  browser = await chromium.launch({ args: ['--host-resolver-rules=MAP localhost 127.0.0.1'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(12000);
  const external = [];
  const errors = [];
  const actions = [];
  page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/api/mobile/password-setup/')) statuses.push(response.status()); });
  page.on('pageerror', () => errors.push('pageerror'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin.origin) { external.push('external'); return route.abort(); }
    if (url.pathname.startsWith('/api/mobile/password-setup/')) actions.push(url.pathname.split('/').pop());
    if (input.mode === 'browser_loss' && url.pathname.endsWith('/password-setup/submit')) {
      const actual = await route.fetch(); // The real backend must finish before losing its response.
      check('lost_only_actual_committed_success_response', actual.status() === 200 && (await actual.json()).kind === 'password_accepted');
      await actual.dispose();
      return route.abort('connectionreset');
    }
    return route.continue(); // All other business responses travel unchanged.
  });
  stage = 'document';
  await page.goto(destination);
  await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
  check('scrubbed_before_deliberate_redemption', page.url() === origin.origin + '/ea-set-password' && actions.length === 0);
  stage = 'redemption';
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('New password', { exact: true }).waitFor();
  stage = 'password';
  if (input.mode === 'weak_retry') {
    await page.getByLabel('New password', { exact: true }).fill('abcdefgh');
    await page.getByLabel('Confirm new password').fill('abcdefgh');
    await page.getByRole('button', { name: 'Save password' }).click();
    await page.getByText('Choose a stronger password, then try again.', { exact: false }).waitFor();
    check('weak_password_rejected_without_losing_form', actions.join(',') === 'redeem,submit');
  }
  await page.getByLabel('New password', { exact: true }).fill(input.password);
  await page.getByLabel('Confirm new password').fill(input.password);
  await page.getByRole('button', { name: 'Save password' }).click();
  const lost = ['provider_loss', 'browser_loss'].includes(input.mode);
  const expected = lost ? 'Your password may have changed, but we could not confirm completion.' : input.mode === 'invite' ? 'Your password has been set. Your programme manager will confirm when your account is ready.' : 'Your password has been updated.';
  await page.getByText(expected, { exact: false }).waitFor();
  check(lost ? 'actual_application_truthful_uncertainty' : 'actual_application_success', actions.join(',') === (input.mode === 'weak_retry' ? 'redeem,submit,submit,discard' : 'redeem,submit,discard'));
  check('no_external_requests_or_browser_errors', external.length === 0 && errors.length === 0);
  check('empty_browser_secret_residue', await page.evaluate(() => !location.search && !location.hash && localStorage.length === 0 && sessionStorage.length === 0 && document.querySelectorAll('input[type=password]').length === 0));
  process.stdout.write(JSON.stringify({ passed: true, checks }));
} catch {
  process.stdout.write(JSON.stringify({ passed: false, stage, checks, statuses }));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
