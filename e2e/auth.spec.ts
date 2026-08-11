import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "./test";

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
  test("guest does not see the Project Management group in header", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/");
    const nav = page.locator("header nav");
    // Public nav groups render as NavigationMenuTrigger buttons
    await expect(nav.getByRole("button", { name: "About" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Impact" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Resources" })).toBeVisible();
    // Project Management (which contains the Schools sub-items) is gated on role=funder
    await expect(
      nav.getByRole("button", { name: "Project Management" })
    ).not.toBeVisible();
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
