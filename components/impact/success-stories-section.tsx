export default function SuccessStoriesSection() {
  return (
    <section className="bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Success Stories
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Behind the Numbers
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Every data point represents a child. Hear from Sibongile about how
            the Zazi iZandi programme has changed lives in her community.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="rounded-xl overflow-hidden shadow-2xl aspect-video">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/zr9Hvurpkqw"
              title="Sibongile's Story — Zazi iZandi"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}
