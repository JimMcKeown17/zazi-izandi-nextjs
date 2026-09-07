import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import type { TeacherMetadata } from "@/lib/teacher/types";
import { getTeacherClassroom } from "@/lib/teacher/api";
import { ClassroomHeader } from "@/components/teacher/classroom-header";
import { ClassroomView } from "@/components/teacher/classroom-view";

export default async function MyClassroomPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const meta = sessionClaims?.metadata as TeacherMetadata | undefined;

  if (!meta?.teampact_user_ids?.length) {
    return (
      <>
        <Header />
        <main className="pt-20">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center">
            <h1 className="text-xl font-semibold text-slate-900">
              Account not linked
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Your account is not yet linked to a classroom. Please contact
              your Masinyusane coordinator for help.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const result = await getTeacherClassroom(
    meta.teampact_user_ids,
    meta.teacher_name
  );

  if (!result.ok) {
    return (
      <>
        <Header />
        <main className="pt-20">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4">
              <h1 className="text-sm font-semibold text-amber-800">
                Data is not available right now
              </h1>
              <p className="mt-1 text-xs text-amber-700">
                We couldn&apos;t load your classroom data. This usually means
                the backend is temporarily unavailable. Please try again in a
                few minutes.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const { data, groupSessions } = result;

  return (
    <>
      <Header />
      <main className="pt-20">
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
          <ClassroomHeader summary={data} />
          <ClassroomView summary={data} groupSessions={groupSessions} />
        </div>
      </main>
      <Footer />
    </>
  );
}
