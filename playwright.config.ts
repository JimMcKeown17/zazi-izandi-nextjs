import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const clerkConfigured = Boolean(
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY) &&
    (process.env.CLERK_SECRET_KEY || process.env.CLERK_TESTING_TOKEN)
);
const mockedReassignDjango = process.env.E2E_REASSIGN_DJANGO_MOCKED === "1";
const mockedProgrammeFidelityDjango =
  process.env.E2E_PROGRAMME_FIDELITY_DJANGO_MOCKED === "1";

const mockedDjangoServer = mockedProgrammeFidelityDjango
  ? {
      command: "node e2e/programme-fidelity-django-mock.mjs",
      url: "http://127.0.0.1:4011/health",
      reuseExistingServer: !process.env.CI,
    }
  : {
      command: "node e2e/reassign-django-mock.mjs",
      url: "http://127.0.0.1:4010/health",
      reuseExistingServer: !process.env.CI,
    };

const mockedDjangoUrl = mockedProgrammeFidelityDjango
  ? "http://127.0.0.1:4011"
  : "http://127.0.0.1:4010";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: mockedReassignDjango || mockedProgrammeFidelityDjango
    ? [
        mockedDjangoServer,
        {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          env: {
            ...process.env,
            DJANGO_API_URL: mockedDjangoUrl,
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
