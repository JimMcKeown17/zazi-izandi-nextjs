import { expect, test } from "./test";

const VALID_USER_ID = "3eb26195-c9b4-41a2-a01d-3b341a28177e"; // same seeded EA as mobile-app-users.spec.ts

test.describe("Coach Plus panel", () => {
  test("junior staff cannot reach the profile at all (existing authorization)", async ({ page, signInAsRole }) => {
    await signInAsRole("junior_staff");
    await page.goto(`/mobile-app/users/${VALID_USER_ID}`);
    await expect(page).toHaveURL(/\/login\?error=insufficient_role/);
  });

  test("zz_data_manager reaches the profile but never sees the panel", async ({ page, signInAsRole }) => {
    await signInAsRole("zz_data_manager");
    await page.goto(`/mobile-app/users/${VALID_USER_ID}`);
    await expect(page.getByTestId("mobile-user-profile-success")).toBeVisible();
    await expect(page.getByTestId("coach-plus-panel")).toHaveCount(0);
  });

  test("admin can switch Plus on, and a reload reads it back from Django", async ({ page, signInAsRole }) => {
    await signInAsRole("admin");
    await page.goto(`/mobile-app/users/${VALID_USER_ID}`);
    const panel = page.getByTestId("coach-plus-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/Plus is off/)).toBeVisible();   // seeded EA starts without Plus
    await panel.getByRole("button", { name: /switch plus on/i }).click();
    await panel.getByRole("button", { name: /^confirm$/i }).click();
    await expect(panel.getByText(/Plus is on/)).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("coach-plus-panel").getByText(/Plus is on/)).toBeVisible();
    // Leave the fixture as found.
    await page.getByTestId("coach-plus-panel").getByRole("button", { name: /switch plus off/i }).click();
    await page.getByTestId("coach-plus-panel").getByRole("button", { name: /^confirm$/i }).click();
    await expect(page.getByTestId("coach-plus-panel").getByText(/Plus is off/)).toBeVisible();
  });
});
