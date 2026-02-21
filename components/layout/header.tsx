"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  Users,
  BookOpen,
  TrendingUp,
  LayoutDashboard,
  Newspaper,
  FolderOpen,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

// Role hierarchy — mirrors middleware.ts
type Role = "funder" | "junior_staff" | "senior_staff" | "admin";

const ROLE_LEVELS: Record<Role, number> = {
  funder: 1,
  junior_staff: 2,
  senior_staff: 3,
  admin: 4,
};

function hasAccess(userRole: Role | undefined, minRole: Role): boolean {
  if (!userRole) return false;
  return (ROLE_LEVELS[userRole] ?? 0) >= ROLE_LEVELS[minRole];
}

interface NavItem {
  name: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  minRole: Role | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "About",
    minRole: null,
    items: [
      {
        name: "About Zazi iZandi",
        href: "/about",
        description: "Learn about the Zazi iZandi programme",
        icon: Users,
      },
      {
        name: "Methodology",
        href: "/methodology",
        description: "Our evidence-based literacy approach",
        icon: BookOpen,
      },
    ],
  },
  {
    label: "Impact",
    minRole: null,
    items: [
      {
        name: "Our Impact",
        href: "/impact",
        description: "Results and outcomes from our schools",
        icon: TrendingUp,
      },
      {
        name: "Data Portal",
        href: "/data-portal",
        description: "Live dashboards and analytics",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Resources",
    minRole: null,
    items: [
      {
        name: "News & Media",
        href: "/media",
        description: "Videos, photos, and press coverage",
        icon: Newspaper,
      },
      {
        name: "Materials",
        href: "/resources",
        description: "Tools and materials we've published",
        icon: FolderOpen,
      },
    ],
  },
  {
    label: "Project Management",
    minRole: "funder" as Role,
    items: [
      {
        name: "2024 Schools",
        href: "/schools",
        description: "Education assistant data for 2024",
        icon: MapPin,
      },
      {
        name: "2025 Schools",
        href: "/schools-2025",
        description: "Education assistant data for 2025",
        icon: CalendarDays,
      },
    ],
  },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const userRole = user?.publicMetadata?.role as Role | undefined;

  const visibleGroups = NAV_GROUPS.filter((group) => {
    if (!group.minRole) return true;
    return isSignedIn && hasAccess(userRole, group.minRole);
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => pathname.startsWith(item.href));

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white shadow-md py-2" : "bg-white/95 py-4"
      }`}
    >
      <nav className="container flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/zazi_izandi_logo.png"
            alt="Zazi iZandi"
            width={175}
            height={60}
            className="h-[3.125rem] w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          <NavigationMenu viewport={false}>
            <NavigationMenuList>
              {visibleGroups.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger
                    className={`font-medium text-sm px-3 ${
                      isGroupActive(group)
                        ? "text-primary"
                        : "text-gray-700 hover:text-primary"
                    }`}
                  >
                    {group.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-white border-t-2 border-primary shadow-lg">
                    <ul className="w-[260px] p-2">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={item.href}
                              className={`block select-none rounded-md p-3 no-underline outline-none transition-colors hover:bg-gray-50 ${
                                pathname.startsWith(item.href)
                                  ? "bg-primary/5"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary mt-0.5">
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <div
                                    className={`text-sm font-semibold leading-none mb-1 ${
                                      pathname.startsWith(item.href)
                                        ? "text-primary"
                                        : "text-gray-800"
                                    }`}
                                  >
                                    {item.name}
                                  </div>
                                  <p className="text-xs leading-snug text-gray-500">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Auth: show UserButton when signed in, Login link when not */}
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <Link
              href="/login"
              className="ml-2 font-medium text-gray-700 hover:text-primary transition-colors duration-200"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 text-gray-700 hover:text-primary"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="container py-4 space-y-1">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <button
                  className="flex items-center justify-between w-full py-2 font-medium text-gray-700 hover:text-primary transition-colors"
                  onClick={() => toggleGroup(group.label)}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openGroups[group.label] ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openGroups[group.label] && (
                  <div className="pl-4 pb-2 space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 py-2 text-sm transition-colors duration-200 ${
                          pathname.startsWith(item.href)
                            ? "text-primary font-semibold"
                            : "text-gray-600 hover:text-primary"
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Auth in mobile menu */}
            <div className="pt-3 border-t border-gray-100">
              {isSignedIn ? (
                <div className="flex items-center gap-3 pt-2">
                  <UserButton afterSignOutUrl="/" />
                  <span className="text-sm text-gray-600">
                    {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress}
                  </span>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 font-medium text-primary hover:text-primary transition-colors duration-200"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
