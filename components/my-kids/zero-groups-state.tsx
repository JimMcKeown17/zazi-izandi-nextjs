import { Users } from "lucide-react";

export function ZeroGroupsState() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Users className="h-8 w-8 text-slate-400" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        No groups yet
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        Your groups will appear here once you start teaching.
      </p>
    </div>
  );
}
