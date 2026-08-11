import { clerk } from "@clerk/testing/playwright";
import { expect, test as base } from "@playwright/test";

export type ClerkTestRole =
  | "junior_staff"
  | "senior_staff"
  | "admin"
  | "zz_data_manager"
  | "funder"
  | "ea"
  | "teacher";

const ROLE_EMAIL_VARIABLES: Record<ClerkTestRole, string> = {
  junior_staff: "E2E_CLERK_JUNIOR_STAFF_EMAIL",
  senior_staff: "E2E_CLERK_SENIOR_STAFF_EMAIL",
  admin: "E2E_CLERK_ADMIN_EMAIL",
  zz_data_manager: "E2E_CLERK_ZZ_DATA_MANAGER_EMAIL",
  funder: "E2E_CLERK_FUNDER_EMAIL",
  ea: "E2E_CLERK_EA_EMAIL",
  teacher: "E2E_CLERK_TEACHER_EMAIL",
};

export function hasClerkE2EConfiguration(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY) &&
      (process.env.CLERK_SECRET_KEY || process.env.CLERK_TESTING_TOKEN)
  );
}

export const test = base.extend<{
  clerkReady: void;
  signInAsRole: (role: ClerkTestRole) => Promise<void>;
}>({
  clerkReady: [
    async ({}, use, testInfo) => {
      testInfo.skip(
        !hasClerkE2EConfiguration(),
        "Clerk E2E keys are not configured; authenticated browser proof is unverified."
      );
      await use();
    },
    { auto: true },
    ],
  signInAsRole: async ({ page }, provide, testInfo) => {
    await provide(async (role) => {
      const emailVariable = ROLE_EMAIL_VARIABLES[role];
      const emailAddress = process.env[emailVariable];
      testInfo.skip(
        !emailAddress,
        `Set ${emailVariable} for ${role} authenticated browser proof.`
      );

      await page.goto("/");
      await clerk.signIn({ page, emailAddress: emailAddress! });
    });
  },
});

export { expect };
