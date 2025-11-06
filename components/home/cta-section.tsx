import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, BarChart } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary-100 to-white">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Ready to Learn More?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Explore our comprehensive resources, methodology, and impact data
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-primary hover:bg-primary-800">
                  <Link href="/about">
                    Discover Our Story
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/methodology">
                    View Methodology
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Secondary CTAs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Data Portal */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <BarChart className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Data Portal</h3>
              <p className="text-sm text-gray-600 mb-4">
                Access live dashboards and analytics
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <a
                  href="https://dataportal.zaziizandi.org"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Portal
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Resources */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <Download className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Resources</h3>
              <p className="text-sm text-gray-600 mb-4">
                Download training materials & datasets
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/resources">
                  Browse Resources
                </Link>
              </Button>
            </div>

            {/* Impact */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <BarChart className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Impact Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                See our measurable outcomes
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/impact">
                  View Impact
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}