import Link from "next/link";
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin } from "lucide-react";

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
              A data-driven early literacy intervention program supporting
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
                  href="mailto:info@zaziizandi.org"
                  className="hover:text-white transition-colors"
                >
                  info@zaziizandi.org
                </a>
              </div>
              <div className="flex items-start">
                <Phone className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span>+27 (0) 21 123 4567</span>
              </div>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span>Cape Town, South Africa</span>
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
            </ul>

            {/* Social Media Links */}
            <div className="flex space-x-4">
              <a
                href="#"
                className="hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>
            © {currentYear} Zazi iZandi. All rights reserved. | Empowering
            early literacy through data-driven interventions.
          </p>
        </div>
      </div>
    </footer>
  );
}