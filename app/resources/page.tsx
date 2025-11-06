import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function ResourcesPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary to-primary-800 text-white py-20">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Open Source Resources
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto">
              Access our training materials, games, activities, and data sets
              to support early literacy interventions.
            </p>
          </div>
        </section>

        {/* Resources Content - We'll build this out in Phase 4 */}
        <section className="py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-primary mb-4">
                Coming Soon
              </h2>
              <p className="text-lg text-gray-600">
                We'll build out the full resources page with downloadable
                guides, activities, and datasets in Phase 4.
              </p>
            </div>

            {/* Placeholder sections */}
            <div className="space-y-8">
              <div className="bg-gray-50 p-8 rounded-lg">
                <h3 className="text-2xl font-bold text-primary mb-3">
                  Guides & Manuals
                </h3>
                <p className="text-gray-600">
                  Training guides for teaching assistants in English and isiXhosa
                </p>
              </div>

              <div className="bg-white p-8 rounded-lg border border-gray-200">
                <h3 className="text-2xl font-bold text-primary mb-3">
                  Games & Activities
                </h3>
                <p className="text-gray-600">
                  Letter cards, syllable cards, and board games for literacy development
                </p>
              </div>

              <div className="bg-gray-50 p-8 rounded-lg">
                <h3 className="text-2xl font-bold text-primary mb-3">
                  Data Sets
                </h3>
                <p className="text-gray-600">
                  Assessment data from 2023 and 2024 for research and analysis
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}