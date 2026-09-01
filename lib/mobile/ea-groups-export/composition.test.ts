import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

test("the shared Users header capability-gates the EA groups action", () => {
  const header = read(
    "components",
    "mobile-app",
    "user-profile",
    "users-index-header.tsx"
  );

  assert.match(header, /canExport \? <EaGroupsExportButton \/> : null/);
  assert.match(header, /generatedAt \?/);
  const button = read(
    "components",
    "mobile-app",
    "user-profile",
    "ea-groups-export-button.tsx"
  );
  assert.match(button, /Share only with[\s\S]*authorised staff/);
  assert.match(button, /aria-label="Download EA groups CSV"/);
});

test("the Users page resolves cached auth in parallel and keeps the header on errors", () => {
  const page = read("app", "mobile-app", "users", "page.tsx");

  assert.match(page, /Promise\.all/);
  assert.match(page, /getAuthenticatedMobileSession/);
  assert.match(page, /hasCapability\(session\.role, "mobile\.csv\.export"\)/);
  assert.equal((page.match(/<UsersIndexHeader/g) ?? []).length, 2);
});

test("the route explicitly delegates EA groups to the behavior-tested handler", () => {
  const route = read("app", "mobile-app", "exports", "[kind]", "route.ts");
  const handler = read("lib", "mobile", "ea-groups-export", "handler.ts");
  const transport = read("lib", "mobile", "ea-groups-export", "transport.ts");

  assert.match(route, /kind === "ea-groups"/);
  assert.match(route, /export const maxDuration = 60/);
  assert.match(route, /handleEaGroupsExport/);
  assert.match(handler, /buildEaGroupsExportRequest/);
  assert.match(handler, /readBoundedResponseBytes/);
  assert.match(handler, /EA_GROUPS_EXPORT_CAPACITY_ERROR/);
  assert.match(handler, /EA_GROUPS_EXPORT_SCHEMA/);
  assert.match(transport, /ea-current-groups-capacity-v1/);
  assert.match(transport, /ea-current-groups-v1/);
  assert.match(handler, /X-Zazi-Download-Filename/);
  assert.match(route, /export not found/);
});
