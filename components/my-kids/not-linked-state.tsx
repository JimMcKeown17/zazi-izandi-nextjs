import { LinkIcon } from "lucide-react";

export function NotLinkedState() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
        <LinkIcon className="h-8 w-8 text-amber-600" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        Your account isn&apos;t linked to your teaching profile yet
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-slate-600">
        Please contact your programme manager.
      </p>
      <a
        href="mailto:info@zaziizandi.org"
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      >
        Contact team
      </a>
    </div>
  );
}
