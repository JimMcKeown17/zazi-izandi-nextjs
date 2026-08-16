import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const clerkConfigured = Boolean(
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY) &&
    (process.env.CLERK_SECRET_KEY || process.env.CLERK_TESTING_TOKEN)
);
const mockedReassignDjango = process.env.E2E_REASSIGN_DJANGO_MOCKED === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: mockedReassignDjango
    ? [
        {
          command: "node e2e/reassign-django-mock.mjs",
          url: "http://127.0.0.1:4010/health",
          reuseExistingServer: !process.env.CI,
        },
        {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          env: {
            ...process.env,
            DJANGO_API_URL: "http://127.0.0.1:4010",
            INTERNAL_API_SECRET: "offline-reassign-test-secret",
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
