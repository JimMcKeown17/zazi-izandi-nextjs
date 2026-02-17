export default function VideoSection() {
  return (
    <section className="bg-primary-900 py-20">
      <div className="container">
        {/* Section header */}
        <div className="text-center mb-10">
          <div className="w-12 h-1 bg-accent-yellow mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Watch Zazi iZandi in Action
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            See how our Education Assistants work with children to build
            foundational literacy skills.
          </p>
        </div>

        {/* YouTube embed */}
        <div className="max-w-3xl mx-auto rounded-xl overflow-hidden shadow-2xl aspect-video">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/n0nSzotYEj8"
            title="Zazi iZandi in Action"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
