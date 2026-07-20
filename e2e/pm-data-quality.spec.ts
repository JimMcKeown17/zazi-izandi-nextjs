import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("/pm/data-quality auth (middleware coverage)", () => {
  test("unauthenticated visit redirects to login with redirect_url preserved", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/pm/data-quality");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect_url=%2Fpm%2Fdata-quality");
  });
});
