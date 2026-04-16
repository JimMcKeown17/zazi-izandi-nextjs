import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type Role = "ea" | "teacher" | "funder" | "junior_staff" | "senior_staff" | "admin";

export default async function AfterLoginPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const role = (sessionClaims?.metadata as { role?: Role } | undefined)?.role;

  if (role === "teacher") {
    redirect("/my-classroom");
  }

  if (role === "ea") {
    redirect("/my-kids");
  }

  redirect("/");
}
