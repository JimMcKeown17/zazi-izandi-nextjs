"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  Icon: typeof Sparkles;
  isActive: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/my-kids/today",
    label: "Today",
    Icon: Sparkles,
    isActive: (p) => p.startsWith("/my-kids/today"),
  },
  {
    href: "/my-kids",
    label: "Groups",
    Icon: Users,
    // Groups tab matches the bare overview and any drill-in.
    isActive: (p) =>
      p === "/my-kids" ||
      p.startsWith("/my-kids/groups"),
  },
];

export function BottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="EA navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-[0_-1px_0_rgba(0,0,0,0.03)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-2xl items-stretch">
        {TABS.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-slate-500 hover:text-slate-700",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn("h-5 w-5", active && "text-primary")}
                aria-hidden
              />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
