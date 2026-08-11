"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  School,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Overview",
    href: "/mobile-app",
    icon: LayoutDashboard,
    enabled: true,
  },
  {
    name: "Sessions",
    href: "/mobile-app/sessions",
    icon: CalendarDays,
    enabled: true,
  },
  {
    name: "Clock In/Out",
    href: "/mobile-app/attendance",
    icon: Clock3,
    enabled: false,
  },
  {
    name: "Schools",
    href: "/mobile-app/schools",
    icon: School,
    enabled: false,
  },
  {
    name: "Users",
    href: "/mobile-app/users",
    icon: Users,
    enabled: false,
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/mobile-app") return pathname === item.href;
  return pathname.startsWith(item.href);
}

export function MobileSidebar({
  canReadSessions,
}: {
  canReadSessions: boolean;
}) {
  const pathname = usePathname();
  if (!canReadSessions) return null;

  const enabledItems = NAV_ITEMS.filter((item) => item.enabled);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-slate-900 md:flex">
        <div className="border-b border-slate-700/60 px-4 py-5">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Zazi iZandi
          </span>
          <span className="mt-1 block text-sm font-bold text-accent-yellow">
            Mobile App Data
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            if (!item.enabled) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  title="Planned for a later Phase 1 slice"
                  className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                  <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide">
                    Soon
                  </span>
                </span>
              );
            }

            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-l-2 border-accent-yellow bg-white/10 pl-[10px] font-semibold text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-slate-700/60 px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
          <div className="flex items-center gap-3 px-3 text-xs text-slate-400">
            <UserButton afterSignOutUrl="/" />
            Account
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-slate-700 bg-slate-900 px-3 py-2 md:hidden">
        {enabledItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.name}
              className={cn(
                "flex min-w-20 flex-col items-center gap-1 rounded-md px-3 py-1 text-[10px] font-medium",
                active ? "text-accent-yellow" : "text-slate-300"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
        <Link
          href="/"
          aria-label="Back to site"
          className="flex min-w-20 flex-col items-center gap-1 rounded-md px-3 py-1 text-[10px] font-medium text-slate-300"
        >
          <ArrowLeft className="h-5 w-5" />
          Site
        </Link>
      </nav>
    </>
  );
}
