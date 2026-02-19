"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useUser, UserButton } from "@clerk/nextjs";

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

const ALL_NAV = [
  { name: "Home", href: "/", minRole: null },
  { name: "About", href: "/about", minRole: null },
  { name: "Schools", href: "/schools", minRole: "funder" as Role },
  { name: "Media", href: "/media", minRole: null },
  { name: "Methodology", href: "/methodology", minRole: null },
  { name: "Impact", href: "/impact", minRole: null },
  { name: "Resources", href: "/resources", minRole: null },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const userRole = user?.publicMetadata?.role as Role | undefined;

  const visibleNav = ALL_NAV.filter((item) => {
    if (!item.minRole) return true;
    return isSignedIn && hasAccess(userRole, item.minRole);
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
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
          <span className="text-2xl font-bold text-primary">Zazi iZandi</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-8">
          {visibleNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`font-medium transition-colors duration-200 ${
                isActive(item.href)
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-700 hover:text-primary"
              }`}
            >
              {item.name}
            </Link>
          ))}

          <Button
            asChild
            className="bg-primary hover:bg-primary-800 text-white"
          >
            <a
              href="https://dataportal.zaziizandi.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              Data Portal
            </a>
          </Button>

          {/* Auth: show UserButton when signed in, Login link when not */}
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <Link
              href="/login"
              className="font-medium text-gray-700 hover:text-primary transition-colors duration-200"
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
          <div className="container py-4 space-y-4">
            {visibleNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? "text-primary font-bold"
                    : "text-gray-700 hover:text-primary"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <Button
              asChild
              className="w-full bg-primary hover:bg-primary-800 text-white"
            >
              <a
                href="https://dataportal.zaziizandi.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Data Portal
              </a>
            </Button>

            {/* Auth in mobile menu */}
            {isSignedIn ? (
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <UserButton afterSignOutUrl="/" />
                <span className="text-sm text-gray-600">
                  {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress}
                </span>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block font-medium text-primary hover:text-primary transition-colors duration-200"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
