import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function SchoolsPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-20">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Where We Work
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto">
              Explore the schools and communities where we're making a difference across South Africa
            </p>
          </div>
        </section>

        {/* Content Placeholder */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-primary mb-6">
                Coming Soon: Interactive Map & School Cards
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We'll build an interactive Mapbox map with detailed school cards showing metrics and progress.
              </p>
              <div className="bg-gray-50 p-8 rounded-lg">
                <p className="text-gray-500">
                  This page will include:
                </p>
                <ul className="mt-4 space-y-2 text-left max-w-md mx-auto">
                  <li>✓ Interactive Mapbox map with school locations</li>
                  <li>✓ Beautiful cards for each school</li>
                  <li>✓ Key metrics (students, TAs, progress)</li>
                  <li>✓ Color-coded progress indicators</li>
                  <li>✓ Filterable by region/performance</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}