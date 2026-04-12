import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("/my-kids auth", () => {
  test("unauthenticated users are redirected to /login with redirect_url preserved", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/my-kids");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect_url=%2Fmy-kids");
  });

  test("unauthenticated deep link to a group redirects with full path preserved", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/my-kids/groups/67610");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect_url=%2Fmy-kids%2Fgroups%2F67610");
  });

  test("unauthenticated deep link with query string preserves pathname and search", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/my-kids/groups/67610?tab=sessions");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    // The whole path+search string is URL-encoded into the redirect_url param.
    // Expect the inner `?` to become %3F and `=` to become %3D.
    expect(page.url()).toContain(
      "redirect_url=%2Fmy-kids%2Fgroups%2F67610%3Ftab%3Dsessions"
    );
  });
});
