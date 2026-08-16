import { expect, test } from "./test";

const FROM_EA = "00000000-0000-4000-8000-000000000001";
const TO_EA = "00000000-0000-4000-8000-000000000002";

test.describe("EA roster reassignment — locally mocked Django API", () => {
  test("admin can preview, confirm, execute, and re-preview a mocked handover", async ({
    page,
    signInAsRole,
  }, testInfo) => {
    testInfo.skip(
      process.env.E2E_REASSIGN_DJANGO_MOCKED !== "1",
      "Set E2E_REASSIGN_DJANGO_MOCKED=1 to start the local Django-contract mock; server actions cannot be intercepted from the browser."
    );

    await signInAsRole("admin");
    await page.goto("/mobile-app/reassign");
    await expect(page.getByTestId("mobile-reassign-roster-flow")).toBeVisible();

    await page.getByLabel("Departing EA UUID").fill(FROM_EA);
    await page.getByRole("button", { name: "Preview roster" }).click();
    await expect(page.getByText(/Preview for/)).toBeVisible();

    await page.getByLabel("Successor EA UUID").fill(TO_EA);
    await page.getByLabel("Reason for reassignment").fill("EA has left the programme");
    await page.getByRole("button", { name: "Review and confirm" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Create and execute handover" }).click();

    await expect(page.getByText(/Handover complete/i)).toBeVisible();
    await expect(page.getByText("If this EA is leaving permanently, also deactivate their account in")).toBeVisible();
    await page.getByRole("button", { name: "Re-run roster preview" }).click();
    await expect(page.getByText("The roster is empty.")).toBeVisible();
  });
});
