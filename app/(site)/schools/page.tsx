import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import EACard from "@/components/schools/ea-card";
import SchoolMap from "@/components/schools/school-map";
import { MapPin, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import eaDataRaw from "@/data/ea-data.json";
import schoolLocations from "@/data/school-locations.json";

// Filter out entries without School Name
const eaData = eaDataRaw.filter(ea => ea["School Name"] && ea["School Name"].trim() !== "");

export default function SchoolsPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-green-600 to-emerald-800 text-white py-16">
          <div className="container text-center">
            <MapPin className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Where We Work
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-white/90">
              Explore our Education Assistants and their impact across South African schools
            </p>
          </div>
        </section>

        {/* Map Section - Now with Mapbox */}
        <section className="py-12 bg-gray-50">
          <div className="container">
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Interactive School Map
                </h2>
                <Badge className="bg-green-600 text-white">
                  {schoolLocations.length} Schools
                </Badge>
              </div>
              
              {/* Mapbox Component */}
              <div className="w-full h-[500px] rounded-lg overflow-hidden">
                <SchoolMap schools={schoolLocations} />
              </div>
              
              {/* Map Legend */}
              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">Individual Schools:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                    <span>High Impact</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white"></div>
                    <span>Good Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
                    <span>Needs Support</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">Clusters:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                      5
                    </div>
                    <span>Small (1-9)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      15
                    </div>
                    <span>Medium (10-29)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                      30+
                    </div>
                    <span>Large (30+)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* EA Cards Section */}
        <section className="py-12 bg-white">
          <div className="container">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Education Assistant Performance
                </h2>
                <p className="text-gray-600">
                  Tracking progress and impact across schools and grades
                </p>
              </div>
              
              {/* Performance Legend */}
              <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                <Badge className="bg-green-500 text-white">
                  High Impact: 10+ Gain
                </Badge>
                <Badge className="bg-yellow-500 text-white">
                  Good: 5-9 Gain
                </Badge>
                <Badge className="bg-red-500 text-white">
                  Low: &lt;5 Gain
                </Badge>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-6 border-l-4 border-primary">
                <div className="text-sm text-gray-600 mb-1">Total EAs</div>
                <div className="text-3xl font-bold text-primary">
                  {new Set(eaData.map(d => d["EA Names"])).size}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-l-4 border-green-500">
                <div className="text-sm text-gray-600 mb-1">Schools</div>
                <div className="text-3xl font-bold text-green-700">
                  {new Set(eaData.map(d => d["School Name"])).size}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-6 border-l-4 border-purple-500">
                <div className="text-sm text-gray-600 mb-1">Total Assessments</div>
                <div className="text-3xl font-bold text-purple-700">
                  {eaData.reduce((sum, d) => sum + (d["Total Assessments"] || 0), 0)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 border-l-4 border-orange-500">
                <div className="text-sm text-gray-600 mb-1">Avg Improvement</div>
                <div className="text-3xl font-bold text-orange-700">
                  +{(eaData.reduce((sum, d) => sum + (d.Improvement || 0), 0) / eaData.length).toFixed(1)}
                </div>
              </div>
            </div>

            {/* Filter & Search Bar - Placeholder */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-lg px-4 py-2 border">
                <Search className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by school name or EA..."
                  className="flex-1 outline-none text-sm"
                  disabled
                />
              </div>
              <button className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border hover:bg-gray-50 transition-colors" disabled>
                <Filter className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium">Filters</span>
              </button>
            </div>

            {/* EA Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eaData.map((ea, index) => (
                <EACard key={index} data={ea} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 bg-gradient-to-br from-primary-50 to-blue-50">
          <div className="container text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Want to Learn More About Our Impact?
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Explore detailed data visualizations and performance metrics in our Data Portal
            </p>
            <a
              href="https://dataportal.zaziizandi.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-800 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Open Data Portal
              <MapPin className="h-5 w-5" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}