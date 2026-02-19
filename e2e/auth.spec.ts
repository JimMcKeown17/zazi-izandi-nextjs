import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("home page loads for guests", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/");
    await expect(page).toHaveTitle(/Zazi iZandi/);
  });

  test("about page loads for guests", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/about");
    await expect(page.locator("main")).toBeVisible();
  });

  test("impact page loads for guests", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/impact");
    await expect(page.locator("main")).toBeVisible();
  });

  test("methodology page loads for guests", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/methodology");
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Protected pages", () => {
  test("schools redirects unauthenticated users to /login", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/schools");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});

test.describe("Header navigation", () => {
  test("guest sees no Schools link in header", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/");
    const nav = page.locator("header nav");
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "About" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Impact" })).toBeVisible();
    // Schools should be hidden for guests
    await expect(nav.getByRole("link", { name: "Schools" })).not.toBeVisible();
  });

  test("guest sees Login link in header", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/");
    await expect(
      page.locator("header").getByRole("link", { name: "Login" })
    ).toBeVisible();
  });
});

test.describe("Login page", () => {
  test("login page renders Clerk sign-in", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/login");
    await expect(page.getByText("Zazi iZandi")).toBeVisible();
    await expect(page.getByText("Sign in to access staff resources")).toBeVisible();
  });
});
