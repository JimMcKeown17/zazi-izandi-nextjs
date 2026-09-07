import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/mobile/capabilities";

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
    redirect("/my-kids/today");
  }

  if (role === "zz_data_manager") {
    redirect("/mobile-app");
  }

  redirect("/");
}
