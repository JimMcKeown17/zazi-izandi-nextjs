import { spawnSync } from "node:child_process";
import path from "node:path";


// Deliberately pinned: adding or removing a scenario must update this proof
// boundary, otherwise the browser gate fails closed rather than silently drifting.
const expectedResultCount = "6";
const reportPath = path.join(
  process.env.TMPDIR || "/tmp",
  "teaching-overview-playwright.json"
);
const environment = {
  ...process.env,
  E2E_TEACHING_OVERVIEW_DJANGO_MOCKED: "1",
  TEACHING_OVERVIEW_E2E_REPORT: reportPath,
};

const playwright = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "e2e/teaching-overview.spec.ts",
    "--project=chromium",
  ],
  { env: environment, stdio: "inherit" }
);
const assertion = spawnSync(
  process.execPath,
  ["scripts/assert-playwright-results.mjs", reportPath, expectedResultCount],
  { env: environment, stdio: "inherit" }
);

if (playwright.error) {
  console.error(`Playwright could not start: ${playwright.error.message}`);
}
if (assertion.error) {
  console.error(`Playwright result assertion could not start: ${assertion.error.message}`);
}
process.exit(
  playwright.status === 0 && assertion.status === 0 ? 0 : 1
);
