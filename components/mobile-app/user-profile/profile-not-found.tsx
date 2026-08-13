import Link from "next/link";
import { UserRoundX } from "lucide-react";

export function ProfileNotFound() {
  return (
    <div
      data-testid="mobile-user-profile-not-found"
      className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm"
    >
      <UserRoundX className="mx-auto h-10 w-10 text-slate-400" />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        User profile not found
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
        This user is not in the eligible mobile reporting population. Check the
        Users index and try again.
      </p>
      <Link
        href="/mobile-app/users"
        className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
      >
        Back to Users
      </Link>
    </div>
  );
}
