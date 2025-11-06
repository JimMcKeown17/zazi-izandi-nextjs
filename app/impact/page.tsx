import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function ImpactPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-orange-600 to-orange-800 text-white py-20">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Our Impact
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto">
              See the measurable outcomes and data showing how we're improving literacy rates
            </p>
          </div>
        </section>

        {/* Content Placeholder */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-primary mb-6">
                Coming Soon: Impact Dashboard
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We'll showcase key charts and visualizations from the Data Portal showing our impact.
              </p>
              <div className="bg-gray-50 p-8 rounded-lg">
                <p className="text-gray-500">
                  This page will include:
                </p>
                <ul className="mt-4 space-y-2 text-left max-w-md mx-auto">
                  <li>✓ Key performance indicators</li>
                  <li>✓ Reading benchmark improvements</li>
                  <li>✓ Before/after comparisons</li>
                  <li>✓ Interactive charts from Data Portal</li>
                  <li>✓ Success stories with data</li>
                  <li>✓ Year-over-year progress</li>
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