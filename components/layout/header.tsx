"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Schools", href: "/schools" },
  { name: "Media", href: "/media" },
  { name: "Methodology", href: "/methodology" },
  { name: "Impact", href: "/impact" },
  { name: "Resources", href: "/resources" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

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
          {navigation.map((item) => (
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
            {navigation.map((item) => (
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
          </div>
        </div>
      )}
    </header>
  );
}