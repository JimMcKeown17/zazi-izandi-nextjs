import {
  setupClerkTestingToken,
} from "@clerk/testing/playwright";

import { expect, test, type ClerkTestRole } from "./test";

const ROLE_CASES = [
  {
    role: "junior_staff",
    allowed: true,
  },
  {
    role: "senior_staff",
    allowed: true,
  },
  { role: "admin", allowed: true },
  {
    role: "zz_data_manager",
    allowed: true,
  },
  { role: "funder", allowed: false },
  { role: "ea", allowed: false },
  {
    role: "teacher",
    allowed: false,
  },
] as const satisfies ReadonlyArray<{ role: ClerkTestRole; allowed: boolean }>;

test.describe("Mobile app route authorization", () => {
  test("redirects an unauthenticated sessions deep link with filters intact", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto(
      "/mobile-app/sessions?days=14&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
    );
    await page.waitForURL(/\/login/);

    const redirectUrl = new URL(page.url()).searchParams.get("redirect_url");
    expect(redirectUrl).toBe(
      "/mobile-app/sessions?days=14&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
    );
  });

  test("redirects an unauthenticated Clock In/Out deep link with filters intact", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto(
      "/mobile-app/attendance?days=7&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
    );
    await page.waitForURL(/\/login/);

    const redirectUrl = new URL(page.url()).searchParams.get("redirect_url");
    expect(redirectUrl).toBe(
      "/mobile-app/attendance?days=7&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
    );
  });

  test("redirects an unauthenticated User health deep link with filters intact", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto(
      "/mobile-app/user-health?days=30&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
    );
    await page.waitForURL(/\/login/);

    const redirectUrl = new URL(page.url()).searchParams.get("redirect_url");
    expect(redirectUrl).toBe(
      "/mobile-app/user-health?days=30&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
    );
  });

  for (const roleCase of ROLE_CASES) {
    test(`${roleCase.role} ${
      roleCase.allowed ? "can open" : "cannot open"
    } the Sessions report`, async ({ page, signInAsRole }) => {
      await signInAsRole(roleCase.role);
      await page.goto("/mobile-app/sessions");

      if (roleCase.allowed) {
        await expect(
          page.getByTestId("mobile-sessions-report-success")
        ).toBeVisible();
        await expect(
          page.getByTestId("mobile-sessions-report-error")
        ).toHaveCount(0);
      } else {
        await page.waitForURL(/\/login\?error=insufficient_role/);
        expect(page.url()).toContain("error=insufficient_role");
      }
    });
  }

  for (const roleCase of ROLE_CASES) {
    test(`${roleCase.role} ${
      roleCase.allowed ? "can open" : "cannot open"
    } the Clock In/Out report`, async ({ page, signInAsRole }) => {
      await signInAsRole(roleCase.role);
      await page.goto("/mobile-app/attendance");

      if (roleCase.allowed) {
        await expect(
          page.getByTestId("mobile-attendance-report-success")
        ).toBeVisible();
        await expect(
          page.getByTestId("mobile-attendance-report-error")
        ).toHaveCount(0);
      } else {
        await page.waitForURL(/\/login\?error=insufficient_role/);
        expect(page.url()).toContain("error=insufficient_role");
      }
    });
  }

  for (const roleCase of ROLE_CASES) {
    const canReadUserHealth = [
      "senior_staff",
      "admin",
      "zz_data_manager",
    ].includes(roleCase.role);
    test(`${roleCase.role} ${
      canReadUserHealth ? "can open" : "cannot open"
    } the User health board`, async ({ page, signInAsRole }) => {
      await signInAsRole(roleCase.role);
      await page.goto("/mobile-app/user-health");

      if (canReadUserHealth) {
        await expect(
          page.getByTestId("mobile-user-health-report-success")
        ).toBeVisible();
        await expect(
          page.getByTestId("mobile-user-health-report-error")
        ).toHaveCount(0);
      } else {
        await page.waitForURL(/\/login\?error=insufficient_role/);
        expect(page.url()).toContain("error=insufficient_role");
      }
    });
  }
});
