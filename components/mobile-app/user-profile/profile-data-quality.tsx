import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function ProfileDataQuality() {
  return (
    <div
      data-testid="mobile-user-profile-data-quality"
      className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm"
    >
      <AlertTriangle className="mx-auto h-10 w-10 text-slate-400" />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Profile data needs repair
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
        This EA&apos;s profile can&apos;t be shown because their clock history
        contains invalid entries—for example, a sign-out earlier than its
        sign-in. This is a data problem with this EA&apos;s records, not a
        problem with the app. It needs repair by the engineering team. Other
        EAs are unaffected.
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
