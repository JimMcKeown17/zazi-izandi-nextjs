const highlights = [
  "Creating dignified jobs for unemployed youth",
  "Strengthening early literacy for young children",
  "Supporting government priorities at scale",
  "Delivering measurable, data-driven impact",
];

export default function VideoSection() {
  return (
    <section className="relative bg-primary-900 text-white overflow-hidden">
      {/* Dot texture */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'1.5\' fill=\'%23ffffff\'/%3E%3C/svg%3E")',
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(44,90,160,0.4),transparent)]" />
      <div className="container relative z-10">
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

          </div>
        </div>
      </div>
    </section>
  );
}
