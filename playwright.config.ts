import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const clerkConfigured = Boolean(
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY) &&
    (process.env.CLERK_SECRET_KEY || process.env.CLERK_TESTING_TOKEN)
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
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
