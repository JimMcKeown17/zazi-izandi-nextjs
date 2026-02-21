const highlights = [
  "Creating dignified jobs for unemployed youth",
  "Strengthening early literacy for young children",
  "Supporting government priorities at scale",
  "Delivering measurable, data-driven impact",
];

export default function VideoSection() {
  return (
    <section className="bg-primary-900 text-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-accent-yellow">
              Featured Interview
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Zazi iZandi on National Television
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Following President Ramaphosa&apos;s 2026 State of the Nation
            Address, Masinyusane Executive Director Zama Zulu joined eNCA to
            discuss one of South Africa&apos;s most urgent priorities: meaningful
            youth employment.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          {/* YouTube embed */}
          <div className="lg:col-span-3 rounded-xl overflow-hidden shadow-2xl aspect-video">
            <iframe
              src="https://www.youtube.com/embed/EnEIL25_7Vs"
              title="Zama Zulu on eNCA — Zazi iZandi & Youth Employment"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          {/* Description */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <h3 className="text-2xl font-bold mb-4 leading-snug">
              Youth Employment &amp; Early Literacy — A National Conversation
            </h3>
            <p className="text-white/70 mb-6 leading-relaxed">
              In this national television interview, Zama highlights how the
              Zazi iZandi programme is:
            </p>
            <ul className="space-y-3 mb-6">
              {highlights.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-accent-yellow shrink-0" />
                  <span className="text-white/80 text-sm leading-relaxed">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-white/60 text-sm leading-relaxed">
              As South Africa confronts the twin challenges of youth
              unemployment and early learning gaps, programmes like Zazi iZandi
              offer a practical, proven path forward.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
