import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type Role = "ea" | "funder" | "junior_staff" | "senior_staff" | "admin";

export default async function AfterLoginPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/login");
  }

  // sessionClaims can still be null if the Clerk JWT template is misconfigured
  // (missing `metadata` custom claim). In that case role resolves to undefined
  // and we fall through to redirect("/") — an EA with broken claims lands on
  // the home page rather than /my-kids. Acceptable degraded state.
  const role = (sessionClaims?.metadata as { role?: Role } | undefined)?.role;

  if (role === "ea") {
    redirect("/my-kids");
  }

  redirect("/");
}
