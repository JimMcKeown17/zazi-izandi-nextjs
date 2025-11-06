import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function MethodologyPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-600 to-purple-800 text-white py-20">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Our Methodology
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto">
              Learn about our teaching approach, training materials, and evidence-based interventions
            </p>
          </div>
        </section>

        {/* Content Placeholder */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-primary mb-6">
                Coming Soon: Comprehensive Methodology
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We'll detail our teaching approach, training program, and evidence-based interventions.
              </p>
              <div className="bg-gray-50 p-8 rounded-lg">
                <p className="text-gray-500">
                  This page will include:
                </p>
                <ul className="mt-4 space-y-2 text-left max-w-md mx-auto">
                  <li>✓ Teaching methodology overview</li>
                  <li>✓ TA training program details</li>
                  <li>✓ Assessment framework</li>
                  <li>✓ Intervention strategies</li>
                  <li>✓ Research foundations</li>
                  <li>✓ Training materials download</li>
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