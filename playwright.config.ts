import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const clerkConfigured = Boolean(
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY) &&
    (process.env.CLERK_SECRET_KEY || process.env.CLERK_TESTING_TOKEN)
);
const mockedReassignDjango = process.env.E2E_REASSIGN_DJANGO_MOCKED === "1";
const mockedProgrammeFidelityDjango =
  process.env.E2E_PROGRAMME_FIDELITY_DJANGO_MOCKED === "1";
const mockedTeachingOverviewDjango =
  process.env.E2E_TEACHING_OVERVIEW_DJANGO_MOCKED === "1";

const mockModes = [
  mockedReassignDjango
    ? {
        name: "reassign",
        command: "node e2e/reassign-django-mock.mjs",
        healthUrl: "http://127.0.0.1:4010/health",
        djangoUrl: "http://127.0.0.1:4010",
        coldFetchCache: false,
      }
    : null,
  mockedProgrammeFidelityDjango
    ? {
        name: "programme-fidelity",
        command: "node e2e/programme-fidelity-django-mock.mjs",
        healthUrl: "http://127.0.0.1:4011/health",
        djangoUrl: "http://127.0.0.1:4011",
        coldFetchCache: false,
      }
    : null,
  mockedTeachingOverviewDjango
    ? {
        name: "teaching-overview",
        command: "node e2e/teaching-overview-django-mock.mjs",
        healthUrl: "http://127.0.0.1:4012/health",
        djangoUrl: "http://127.0.0.1:4012",
        coldFetchCache: true,
      }
    : null,
].filter((value) => value !== null);

if (mockModes.length > 1) {
  throw new Error(
    `Choose exactly one mocked Django E2E mode; received ${mockModes.map(({ name }) => name).join(", ")}.`
  );
}
const mockMode = mockModes[0];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: process.env.TEACHING_OVERVIEW_E2E_REPORT
    ? [["json", { outputFile: process.env.TEACHING_OVERVIEW_E2E_REPORT }]]
    : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: mockMode
    ? [
        {
          command: mockMode.command,
          url: mockMode.healthUrl,
          reuseExistingServer: mockMode.coldFetchCache ? false : !process.env.CI,
        },
        {
          command: mockMode.coldFetchCache
            ? "rm -rf .next/cache/fetch-cache && npm run dev"
            : "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: mockMode.coldFetchCache ? false : !process.env.CI,
          env: {
            ...process.env,
            DJANGO_API_URL: mockMode.djangoUrl,
            INTERNAL_API_SECRET: "offline-mobile-contract-test-secret",
          },
        },
      ]
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    ...(clerkConfigured
      ? [
          {
            name: "clerk setup",
            testMatch: /global\.setup\.ts/,
          },
        ]
      : []),
    {
      name: "chromium",
      testIgnore: /global\.setup\.ts/,
      dependencies: clerkConfigured ? ["clerk setup"] : [],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
