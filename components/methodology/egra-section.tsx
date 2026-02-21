const whyItMatters = [
  {
    emoji: "📏",
    title: "A Standardised Measure",
    description:
      "EGRA provides an internationally validated, consistent measure of reading ability — allowing us to compare children's progress against benchmarks and across schools.",
  },
  {
    emoji: "🎯",
    title: "Identifies the Right Gaps",
    description:
      "Unlike grade-level tests, EGRA pinpoints exactly where a child's reading breaks down — whether at letter sounds, blending, decoding, or fluency — so we can intervene precisely.",
  },
  {
    emoji: "📈",
    title: "Tracks Real Progress",
    description:
      "By running EGRA at the start and end of each programme year, we generate rigorous before-and-after evidence of how much children have grown under our intervention.",
  },
  {
    emoji: "🌍",
    title: "Proven Across Africa",
    description:
      "EGRA has been used in over 60 countries to monitor early literacy. Using it places our programme within a global evidence base and makes our results comparable internationally.",
  },
];

export default function EGRASection() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container max-w-6xl">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Assessment
            </span>
            <div className="w-8 h-1 bg-accent-yellow" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Early Grade Reading Assessment
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We use the internationally validated EGRA tool to measure every
            child&apos;s reading ability — giving us rigorous, comparable
            evidence of what&apos;s working and where to improve.
          </p>
        </div>

        {/* Video + intro */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Video embed */}
          <div className="rounded-2xl overflow-hidden shadow-xl aspect-video bg-gray-900">
            <iframe
              src="https://www.youtube.com/embed/-7vRrF1jaXc"
              title="Early Grade Reading Assessment (EGRA)"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          {/* Intro text */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              What Is an EGRA?
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Early Grade Reading Assessment is a short, one-on-one oral
              reading assessment designed specifically for early grade learners.
              It measures the foundational skills that predict long-term reading
              success — from letter-sound knowledge through to reading fluency
              and comprehension.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Developed by RTI International and adopted by governments and NGOs
              across the globe, EGRA gives us a precise, reliable window into
              every child&apos;s reading development — not just whether they
              passed a grade, but exactly what they can and cannot yet do.
            </p>
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/15 rounded-xl">
              <span className="text-2xl">⏱️</span>
              <p className="text-sm text-gray-700">
                <strong>Quick to administer.</strong> Each EGRA takes just
                15–20 minutes per child and is conducted by trained Education
                Assistants — making it practical to run at scale across hundreds
                of classrooms.
              </p>
            </div>
          </div>
        </div>

        {/* Why it matters grid */}
        <div>
          <h3 className="text-center text-2xl font-bold text-gray-900 mb-8">
            Why EGRA Matters to Us
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyItMatters.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all duration-200"
              >
                <div className="text-3xl mb-4">{item.emoji}</div>
                <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
