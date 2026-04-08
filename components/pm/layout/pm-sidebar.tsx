"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  School,
  Calendar,
  BookOpen,
  AlertTriangle,
  ClipboardCheck,
  Eye,
  GitCompare,
  ArrowLeft,
  Grid3X3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/pm", icon: LayoutDashboard, exact: true },
  { name: "Schools", href: "/pm/schools", icon: School },
  { name: "Sessions", href: "/pm/sessions", icon: Calendar },
  { name: "Letter Progress", href: "/pm/letter-progress", icon: BookOpen },
  { name: "Quality Flags", href: "/pm/quality-flags", icon: AlertTriangle },
  { name: "Letter Alignment", href: "/pm/letter-alignment", icon: Grid3X3 },
  { name: "Assessments", href: "/pm/assessments", icon: ClipboardCheck },
  { name: "Mentor Visits", href: "/pm/mentor-visits", icon: Eye },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { name: "Compare", href: "/pm/compare", icon: GitCompare },
];

interface PMSidebarProps {
  flagCount?: number;
}

export function PMSidebar({ flagCount }: PMSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        <span className="hidden lg:inline truncate">{item.name}</span>
        {isFlags && flagCount !== undefined && flagCount > 0 && (
          <span className="hidden lg:inline ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {flagCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <>
      <aside className="hidden md:flex flex-col w-12 lg:w-52 bg-slate-900 sticky top-0 h-screen shrink-0">
        {/* Brand */}
        <div className="px-3 py-4 border-b border-slate-700/50">
          <span className="hidden lg:block text-accent-yellow font-bold text-sm leading-tight">
            Zazi iZandi PM
          </span>
          <span className="lg:hidden text-accent-yellow font-bold text-sm">
            ZI
          </span>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {/* Separator */}
          <div className="my-2 border-t border-slate-700/50" />

          {SECONDARY_NAV_ITEMS.map((item) => (
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
            <span className="hidden lg:inline truncate">Back to site</span>
          </Link>
          <div className="flex items-center gap-3 px-3">
            <UserButton afterSignOutUrl="/" />
            <span className="hidden lg:inline text-slate-400 text-xs truncate">
              Account
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex justify-around py-2 z-50">
        {NAV_ITEMS.slice(0, 4).map((item) => {
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
