"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  School,
  Smartphone,
  Calendar,
  BookOpen,
  AlertTriangle,
  ClipboardCheck,
  Bell,
  Eye,
  ArrowLeft,
  Filter,
  GraduationCap,
  Grid3X3,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCohort } from "@/lib/pm/cohorts";
import { CohortSelector } from "@/components/pm/layout/cohort-selector";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/pm", icon: LayoutDashboard, exact: true },
  { name: "Education Assistants", href: "/pm/education-assistants", icon: Users },
  { name: "Sessions", href: "/pm/sessions", icon: Calendar },
  { name: "Quality Flags", href: "/pm/quality-flags", icon: AlertTriangle },
  { name: "Letter Alignment", href: "/pm/letter-alignment", icon: Grid3X3 },
  { name: "Schools", href: "/pm/schools", icon: School },
  { name: "Assessments", href: "/pm/assessments", icon: ClipboardCheck },
  { name: "Notifications", href: "/pm/notifications", icon: Bell },
  { name: "Mentor Visits", href: "/pm/mentor-visits", icon: Eye },
  { name: "Letter Progress", href: "/pm/letter-progress", icon: BookOpen },
  { name: "EA Mobile View", href: "/pm/ea-mobile-view", icon: Smartphone },
  { name: "Teacher View", href: "/pm/teacher-view", icon: GraduationCap },
];

// Explicit mobile tabs — looked up by href so reordering NAV_ITEMS
// doesn't silently break the mobile bottom tab bar. These are the top 4
// priorities from the desktop nav, plus the "Back to site" arrow
// rendered separately in the mobile tab bar JSX.
const MOBILE_NAV_HREFS = [
  "/pm",
  "/pm/education-assistants",
  "/pm/sessions",
  "/pm/quality-flags",
];
const MOBILE_NAV_ITEMS: NavItem[] = MOBILE_NAV_HREFS
  .map((href) => NAV_ITEMS.find((item) => item.href === href))
  .filter((item): item is NavItem => item !== undefined);

function subscribeToHydration() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

interface PMSidebarProps {
  flagCount?: number;
  canSendNotifications?: boolean;
}

export function PMSidebar({ flagCount, canSendNotifications = false }: PMSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot
  );
  const currentCohort = parseCohort(searchParams.get("cohort"));

  function buildHref(basePath: string): string {
    const cohort = searchParams.get("cohort");
    if (cohort && cohort !== "treatment") {
      return `${basePath}?cohort=${encodeURIComponent(cohort)}`;
    }
    return basePath;
  }

  function isActive(href: string, exact?: boolean): boolean {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href, item.exact);
    const isFlags = item.href === "/pm/quality-flags";

    return (
      <Link
        href={buildHref(item.href)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
          active
            ? "bg-white/10 text-white font-semibold border-l-2 border-accent-yellow pl-[10px]"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{item.name}</span>
        {isFlags && flagCount !== undefined && flagCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {flagCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <>
      <aside className="hidden md:flex print:!hidden flex-col w-52 bg-slate-900 sticky top-0 h-screen shrink-0">
        {/* Brand */}
        <div className="px-3 py-4 border-b border-slate-700/50">
          <span className="block text-accent-yellow font-bold text-sm leading-tight">
            Zazi iZandi PM
          </span>
        </div>

        <div className="px-3 py-3 border-b border-slate-700/50">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Cohort
          </div>
          <CohortSelector
            currentCohort={currentCohort}
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-white outline-none cursor-pointer focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow/60"
          />
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.filter((item) => (
            item.href !== "/pm/notifications" || canSendNotifications
          )).map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

        </nav>

        {/* Bottom section */}
        <div className="px-2 py-3 border-t border-slate-700/50 flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">Back to site</span>
          </Link>
          <div className="flex items-center gap-3 px-3">
            {isHydrated ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <div
                className="h-7 w-7 shrink-0 rounded-full bg-slate-700"
                aria-hidden="true"
              />
            )}
            <span className="text-slate-400 text-xs truncate">
              Account
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden print:!hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex justify-around py-2 z-50">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={buildHref(item.href)}
              className={cn("p-2 rounded-md", active ? "text-accent-yellow" : "text-slate-400")}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
        <Link href="/" className="p-2 rounded-md text-slate-400">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </nav>
    </>
  );
}
