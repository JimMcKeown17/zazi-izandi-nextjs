import { defineConfig } from "@playwright/test";

// This isolated component-browser suite never starts Next, Clerk, or hosted Auth.
export default defineConfig({
  testDir: "./e2e/password",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { browserName: "chromium", headless: true, trace: "off" },
});
