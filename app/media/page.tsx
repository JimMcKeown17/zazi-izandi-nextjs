import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function MediaPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-pink-600 to-pink-800 text-white py-20">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Media & Gallery
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto">
              Photos, videos, and stories from our classrooms and communities
            </p>
          </div>
        </section>

        {/* Content Placeholder */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-primary mb-6">
                Coming Soon: Photo & Video Gallery
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We'll build a beautiful gallery showcasing our work in schools and communities.
              </p>
              <div className="bg-gray-50 p-8 rounded-lg">
                <p className="text-gray-500">
                  This page will include:
                </p>
                <ul className="mt-4 space-y-2 text-left max-w-md mx-auto">
                  <li>✓ Photo gallery with lightbox</li>
                  <li>✓ Video gallery (YouTube embeds)</li>
                  <li>✓ Success stories and testimonials</li>
                  <li>✓ News features and press coverage</li>
                  <li>✓ Filterable by category</li>
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