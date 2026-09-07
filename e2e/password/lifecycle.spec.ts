import { expect, test } from "@playwright/test";
import { build } from "esbuild";

const origin = "https://www.zazi-izandi.co.za";
const callback = `${origin}/ea-set-password#access_token=synthetic-access&refresh_token=synthetic-refresh&type=recovery&sb=`;
let bundle: string;

type PasswordFixtureWindow = Window & {
  probe: { captures: number; updates: number; signOuts: number; hasSession: boolean; completions: number };
  deferCapture: boolean;
  deferUpdate: boolean;
  finishCapture(): void;
  finishUpdate(): void;
  unmountPasswordPage(): void;
};

test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `
        import React, { StrictMode } from 'react';
        import { createRoot } from 'react-dom/client';
        import Page from './app/(password)/ea-set-password/page';
        const root = createRoot(document.getElementById('root'));
        window.unmountPasswordPage = () => root.unmount();
        root.render(<StrictMode><Page /></StrictMode>);
      `,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"development"',
      "process.env.NEXT_PUBLIC_SUPABASE_URL": '"https://yaclyyurdwarhmiheojr.supabase.co"',
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '"synthetic-public-config"',
    },
    plugins: [{
      name: "synthetic-password-provider",
      setup(builder) {
        builder.onResolve({ filter: /ea-set-password\/browser-supabase$/ }, () => ({
          path: "synthetic-password-provider", namespace: "password-fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "password-fixture" }, () => ({
          contents: `
            export function createPasswordSupabaseClient() {
              if (location.hash || location.search) throw Error('callback was not scrubbed first');
              return { auth: {
                async setSession() {
                  window.probe.captures++;
                  if (window.deferCapture) await new Promise(resolve => window.finishCapture = resolve);
                  window.probe.hasSession = true;
                  return { data: { session: {access_token: 'synthetic-access'}, user: {} }, error: null };
                },
                async updateUser() {
                  window.probe.updates++;
                  if (window.deferUpdate) await new Promise(resolve => window.finishUpdate = resolve);
                  return { error: null };
                },
                async signOut() { window.probe.signOuts++; window.probe.hasSession = false; }
              }};
            }
          `,
          loader: "js",
        }));
      },
    }],
  });
  bundle = result.outputFiles[0].text;
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { probe: { captures: 0, updates: 0, signOuts: 0, hasSession: false, completions: 0 } });
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) throw new Error(`Unexpected external request to ${url.origin}`);
    if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "text/javascript", body: bundle });
    if (url.pathname === "/api/mobile/password-completion") {
      await page.evaluate(() => { (window as unknown as PasswordFixtureWindow).probe.completions++; });
      return route.fulfill({ status: 503, json: { kind: "completion_unconfirmed" } });
    }
    return route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script src="/fixture.js"></script>' });
  });
});

test("Strict Mode retains one ready journey after scrub and completes self-service recovery", async ({ page }) => {
  await page.goto(callback);
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(`${origin}/ea-set-password`);
  await page.getByLabel("New password", { exact: true }).fill("synthetic-password");
  await page.getByLabel("Confirm new password").fill("synthetic-password");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("You can now sign in to the Zazi iZandi app.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe)).toEqual({
    captures: 1, updates: 1, signOuts: 1, hasSession: false, completions: 0,
  });
  await page.reload();
  await expect(page.getByText("This password link is no longer valid.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
});

test("a real unmount discards a ready temporary session", async ({ page }) => {
  await page.goto(callback);
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as PasswordFixtureWindow).unmountPasswordPage());
  await expect.poll(() => page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe)).toEqual({
    captures: 1, updates: 0, signOuts: 1, hasSession: false, completions: 0,
  });
});

test("a provider session arriving after unmount is discarded", async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as PasswordFixtureWindow).deferCapture = true; });
  await page.goto(callback);
  await expect.poll(() => page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe.captures)).toBe(1);
  await page.evaluate(() => (window as unknown as PasswordFixtureWindow).unmountPasswordPage());
  await page.evaluate(() => (window as unknown as PasswordFixtureWindow).finishCapture());
  await expect.poll(() => page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe.hasSession)).toBe(false);
  expect(await page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe.signOuts)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe.completions)).toBe(0);
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
});

test("unmount during password update prevents a late operation-completion request", async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as PasswordFixtureWindow).deferUpdate = true; });
  await page.goto(callback.replace("#", "?operation_id=11111111-1111-4111-8111-111111111111#"));
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("synthetic-password");
  await page.getByLabel("Confirm new password").fill("synthetic-password");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe.updates)).toBe(1);
  await page.evaluate(() => (window as unknown as PasswordFixtureWindow).unmountPasswordPage());
  await page.evaluate(() => (window as unknown as PasswordFixtureWindow).finishUpdate());
  await expect.poll(() => page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe.hasSession)).toBe(false);
  expect(await page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe.completions)).toBe(0);
});


test("unconfirmed operation completion discards the session and offers no success", async ({ page }) => {
  await page.goto(callback.replace("#", "?operation_id=11111111-1111-4111-8111-111111111111#"));
  await page.getByLabel("New password", { exact: true }).fill("synthetic-password");
  await page.getByLabel("Confirm new password").fill("synthetic-password");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Your password was changed, but", { exact: false })).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as PasswordFixtureWindow).probe)).toEqual({
    captures: 1, updates: 1, signOuts: 1, hasSession: false, completions: 1,
  });
});

test('exact proof link waits for recipient, scrubs URL and records invitation password without activation claim',async({page})=>{
 const calls:string[]=[];
 await page.route('**/api/mobile/password-setup/*',async route=>{
  const action=new URL(route.request().url()).pathname.split('/').pop()!;
  calls.push(action);
  expect(page.url()).toBe(origin+'/ea-set-password');
  if(action==='redeem')return route.fulfill({json:{kind:'ready',access_token:'temporary-proof'}});
  if(action==='submit'){
   expect(route.request().headers().authorization).toBe('Bearer temporary-proof');
   expect(route.request().postDataJSON()).toEqual({operation_id:'123e4567-e89b-42d3-a456-426614174000',password:'synthetic-password'});
   return route.fulfill({json:{kind:'password_accepted',journey:'invite'}});
  }
  return route.fulfill({json:{kind:'discarded'}});
 });
 await page.goto(origin+'/ea-set-password#operation_id=123e4567-e89b-42d3-a456-426614174000&token_hash='+'b'.repeat(56));
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeVisible();
 expect(calls).toEqual([]);
 await expect(page).toHaveURL(origin+'/ea-set-password');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('New password',{exact:true}).fill('synthetic-password');
 await page.getByLabel('Confirm new password').fill('synthetic-password');
 await page.getByRole('button',{name:'Save password'}).click();
 await expect(page.getByText('Your programme manager will confirm when your account is ready.',{exact:false})).toBeVisible();
 await expect(page.getByText('Return to the Zazi iZandi mobile app',{exact:false})).toHaveCount(0);
 expect(calls).toEqual(['redeem','submit','discard']);
 expect(await page.evaluate(()=>Object.keys(localStorage).length+Object.keys(sessionStorage).length)).toBe(0);
});

test('pagehide clears password fields and prevents BFCache restoration from retaining a usable journey',async({page})=>{
 const calls:string[]=[];
 await page.route('**/api/mobile/password-setup/*',async route=>{
  const action=new URL(route.request().url()).pathname.split('/').pop()!;calls.push(action);
  return route.fulfill({json:action==='redeem'?{kind:'ready',access_token:'temporary-proof'}:{kind:'discarded'}});
 });
 await page.goto(origin+'/ea-set-password#operation_id=123e4567-e89b-42d3-a456-426614174000&token_hash='+'b'.repeat(56));
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('New password',{exact:true}).fill('synthetic-password');
 const values=await page.evaluate(()=>{
  window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
  return [...document.querySelectorAll<HTMLInputElement>('input[type=password]')].map(input=>input.value);
 });
 expect(values.every(value=>value==='')).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await expect(page.getByText('This password link is no longer valid.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Save password'})).toHaveCount(0);
 await expect.poll(()=>calls).toEqual(['redeem','discard']);
});
