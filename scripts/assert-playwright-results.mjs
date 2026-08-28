import fs from "node:fs";

const file = process.argv[2];
const expectedRaw = process.argv[3];
if (!file) {
  console.error("Usage: node scripts/assert-playwright-results.mjs <playwright-json-report> [expected-result-count]");
  process.exit(2);
}
const expected = expectedRaw === undefined ? null : Number(expectedRaw);
if (expected !== null && (!Number.isInteger(expected) || expected <= 0)) {
  console.error("Expected result count must be a positive integer.");
  process.exit(2);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (error) {
  console.error(`Playwright report is unreadable or malformed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(2);
}

const results = [];
function visitSuite(suite) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      for (const result of test.results ?? []) results.push(result.status);
    }
  }
  for (const child of suite.suites ?? []) visitSuite(child);
}
for (const suite of report.suites ?? []) visitSuite(suite);

const passed = results.filter((status) => status === "passed").length;
const skipped = results.filter((status) => status === "skipped").length;
const unexpected = results.filter((status) => !["passed", "skipped"].includes(status)).length;
if (
  passed === 0 ||
  skipped > 0 ||
  unexpected > 0 ||
  (expected !== null && results.length !== expected)
) {
  console.error(
    `Playwright proof failed: total=${results.length}, expected=${expected ?? "any positive count"}, passed=${passed}, skipped=${skipped}, unexpected=${unexpected}`
  );
  process.exit(1);
}
console.log(
  `Playwright proof passed: ${passed} tests, expected count ${expected ?? "not pinned"}, no skips or unexpected results.`
);
