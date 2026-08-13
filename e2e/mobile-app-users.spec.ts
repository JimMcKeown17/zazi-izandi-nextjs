import { expect, test } from "./test";

const VALID_USER_ID = "3eb26195-c9b4-41a2-a01d-3b341a28177e";

test.describe("Mobile app Users authorization and navigation", () => {
  test("senior staff can horizontally reach Users and Site at 375x812 and open the users index", async ({
    page,
    signInAsRole,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signInAsRole("senior_staff");
    await page.goto("/mobile-app");

    const nav = page.getByTestId("mobile-nav-scroll");
    await expect(nav).toBeVisible();
    const dimensions = await nav.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);

    await nav.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect
      .poll(() => nav.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    const users = page.getByRole("link", { name: "Users" });
    const site = page.getByRole("link", { name: "Back to site" });
    await expect(users).toBeVisible();
    await expect(site).toBeVisible();
    await expect(users).toHaveAttribute("href", "/mobile-app/users");
    await expect(site).toHaveAttribute("href", "/");
    await site.click({ trial: true });

    await users.click();
    await expect(page).toHaveURL(/\/mobile-app\/users$/);
    await expect(page.getByTestId("mobile-users-index-success")).toBeVisible();
  });

  test("senior staff see the shared not-found state for a malformed profile id", async ({
    page,
    signInAsRole,
  }) => {
    await signInAsRole("senior_staff");
    await page.goto("/mobile-app/users/not-a-uuid");

    await expect(
      page.getByTestId("mobile-user-profile-not-found")
    ).toBeVisible();
    await expect(page.getByText("User profile not found")).toBeVisible();
  });

  test("junior staff are redirected for valid and malformed profile ids and never see Users in nav", async ({
    page,
    signInAsRole,
  }) => {
    await signInAsRole("junior_staff");
    await page.goto("/mobile-app/sessions");
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);

    for (const id of [VALID_USER_ID, "not-a-uuid"]) {
      await page.goto(`/mobile-app/users/${id}`);
      await page.waitForURL(/\/login\?error=insufficient_role/);
      expect(page.url()).toContain("error=insufficient_role");
    }
  });
});
