import Link from "next/link";

import { cn } from "@/lib/utils";

export function UserHealthTabs({
  active,
}: {
  active: "overview" | "sync-diagnostics";
}) {
  const tabs = [
    {
      id: "overview" as const,
      label: "Overview",
      href: "/mobile-app/user-health",
    },
    {
      id: "sync-diagnostics" as const,
      label: "Sync diagnostics",
      href: "/mobile-app/user-health/sync-diagnostics",
    },
  ];

  return (
    <nav aria-label="User health sections" className="border-b border-slate-200">
      <div className="flex gap-5">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active === tab.id ? "page" : undefined}
            className={cn(
              "border-b-2 px-1 pb-2 text-sm font-semibold transition-colors",
              active === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
