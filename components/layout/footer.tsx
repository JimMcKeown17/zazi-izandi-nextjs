import Link from "next/link";
import { Mail, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Zazi iZandi</h3>
            <p className="text-sm leading-relaxed">
              A data-driven early literacy intervention programme supporting
              Foundation Phase learners in South African schools.
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Mail className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:joy@bindingconstraintslab.org"
                  className="hover:text-white transition-colors"
                >
                  joy@bindingconstraintslab.org
                </a>
              </div>

              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span>Eastern Cape, South Africa</span>
              </div>
            </div>
          </div>

          {/* Quick Links & Social */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2 mb-6">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/resources"
                  className="hover:text-white transition-colors"
                >
                  Resources
                </Link>
              </li>
              <li>
                <a
                  href="https://dataportal.zaziizandi.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Data Portal
                </a>
              </li>
              <li>
                <Link
                  href="/support"
                  className="hover:text-white transition-colors"
                >
                  App Support
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-white transition-colors"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms
                </Link>
              </li>
            </ul>

            {/* Social Media Links */}

          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>
            © {currentYear} Zazi iZandi. All rights reserved.
            <span className="mx-2" aria-hidden="true">
              |
            </span>
            Website by AI5 Labs.
          </p>
        </div>
      </div>
    </footer>
  );
}
