/** Actual Sessions page and downloads in Chromium; Clerk and Django are
 * synthetic boundaries. No hosted requests or real staff records are used.
 * Run: node --import tsx --test e2e/session-downloads.test.mjs */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { handleSessionExport } from "../lib/mobile/session-exports/handler.ts";
import { sessionExportConfig } from "../lib/mobile/session-exports/transport.ts";

const date = "2026-09-01";
const timestamp = "2026-09-10T12:00:00.000000Z";
const fixtures = {
  auth: `export async function requireMobileSessionsSession() {
    return {role: window.fixtureRole};
  }`,
  api: `import {VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD} from '@/lib/mobile/test-fixtures';
    export async function getMobileSessionsActivity() {
      return window.fixtureFailure
        ? {ok:false,status:502,message:'Synthetic report outage'}
        : {ok:true,data:VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD};
    }
    export async function getMobileSessionReviewFlags() {
      return {ok:true,data:{count:0,flags:[]}};
    }`,
  link: `import React from 'react';
    export default function Link({children,prefetch,...props}) {
      return <a {...props}>{children}</a>;
    }`,
};
let browser, bundle;

before(async () => {
  const built = await build({
    stdin: {
      contents: `import React from 'react';
        import {createRoot} from 'react-dom/client';
        import Page from './app/(site)/mobile-app/sessions/page';
        Page({searchParams:Promise.resolve({school_type:'primary'})})
          .then(element=>createRoot(document.getElementById('root')).render(element));`,
      loader: "tsx",
      resolveDir: process.cwd(),
    },
    bundle: true, write: false, platform: "browser", format: "iife",
    define: { "process.env.NODE_ENV": '"test"' },
    plugins: [{
      name: "synthetic-auth-and-report-boundaries",
      setup(b) {
        b.onResolve({filter: /^@\/lib\/mobile\/(auth|api)$/}, args => ({
          path: args.path.split("/").at(-1), namespace: "fixture",
        }));
        b.onResolve({filter: /^next\/link$/}, () => ({path: "link", namespace: "fixture"}));
        b.onLoad({filter: /.*/, namespace: "fixture"}, args => ({
          contents: fixtures[args.path], loader: "tsx", resolveDir: process.cwd(),
        }));
      },
    }],
  });
  bundle = built.outputFiles[0].text;
  browser = await chromium.launch({headless: true});
});
after(async () => { await browser?.close(); });

function upstreamCsv(kind) {
  const config = sessionExportConfig(kind);
  const header = kind === "sessions-payroll-summary"
    ? `data_as_of_utc,ea_user_id,ea_name,employment_status,reporting_school_id_current,reporting_school_name_current,reporting_school_type_current,${date},total_sessions`
    : "data_as_of_utc,session_id,session_date,started_at_sast,ended_at_sast,duration_seconds,duration_minutes,ea_user_id,ea_name,employment_status,school_id_current,school_name_current,school_type_current,school_attribution,group_ids,group_names_current,present_attendees,absent_attendees,excused_attendees,total_attendees";
  const filename = `zazi-mobile-sessions-${config.filenameSlug}-${date}-to-${date}-as-of-20260910T120000Z.csv`;
  return new Response(`\ufeff${header}\r\n`, {headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "X-Zazi-Export-Schema": config.schema,
    "X-Zazi-Range-Start": date,
    "X-Zazi-Range-End-Inclusive": date,
    "X-Zazi-Data-As-Of": timestamp,
    "X-Zazi-Download-Filename": filename,
    "Content-Disposition": `attachment; filename="${filename}"`,
  }});
}

for (const [role, failure] of [
  ["junior_staff", false], ["senior_staff", false],
  ["admin", false], ["zz_data_manager", false], ["junior_staff", true],
]) {
  test(`${role} downloads both session CSVs with report ${failure ? "unavailable" : "available"}`, async t => {
    const page = await browser.newPage({acceptDownloads: true});
    page.setDefaultTimeout(5000);
    t.after(() => page.close());
    const errors = [], requests = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => route.abort());
    await page.exposeFunction("requestSessionExport", async url => {
      const request = new Request(`https://fixture.invalid${url}`);
      const kind = new URL(request.url).pathname.split("/").at(-1);
      requests.push(kind);
      const response = await handleSessionExport(request, kind, {
        getSession: async () => ({userId:"staff_fixture", sessionClaims:{metadata:{role}}, getToken:async()=>"fixture-token"}),
        fetchUpstream: async path => {
          assert.match(path, /school_type=primary/);
          return upstreamCsv(kind);
        },
        today: () => "2026-09-10",
      });
      return {status:response.status, headers:Object.fromEntries(response.headers), body:await response.text()};
    });
    await page.setContent('<div id="root"></div>');
    await page.evaluate(({role, failure}) => {
      window.fixtureRole = role;
      window.fixtureFailure = failure;
      window.fetch = async url => {
        const result = await window.requestSessionExport(url);
        return new Response(result.body, {status:result.status, headers:result.headers});
      };
    }, {role, failure});
    await page.addScriptTag({content:bundle});
    await page.getByRole("heading", {name:"Download session records"}).waitFor();
    await page.getByLabel("Range type").selectOption("custom");
    await page.getByLabel("Start date", {exact:true}).fill(date);
    await page.getByLabel("End date", {exact:true}).fill(date);
    for (const label of ["payroll summary", "session detail"]) {
      const downloadReady = page.waitForEvent("download").catch(async error => {
        throw new Error(`${error.message}; status: ${await page.getByTestId("mobile-session-exports").innerText()}; requests: ${requests.join(",")}`);
      });
      await page.getByRole("button", {name:`Download ${label}`, exact:true}).click();
      const download = await downloadReady;
      assert.equal(await download.failure(), null);
      assert.match(download.suggestedFilename(), /^zazi-mobile-sessions-.*2026-09-01-to-2026-09-01.*\.csv$/);
      await page.getByText("Download ready.", {exact:false}).waitFor();
    }
    assert.deepEqual(requests, ["sessions-payroll-summary", "sessions-detail"]);
    assert.deepEqual(errors, []);
  });
}
