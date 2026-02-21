const soundGroups = [
  {
    phase: "Phase 1",
    title: "Individual Letter Sounds",
    sounds: ["s", "a", "t", "i", "p", "n", "m", "d", "o", "g"],
    description:
      "Children first learn the most common letter-sound correspondences, focusing on the sounds letters make — not just their names.",
    color: "from-blue-500 to-blue-600",
    light: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    phase: "Phase 2",
    title: "Blending Two Sounds",
    sounds: ["sa", "at", "in", "on", "ma", "da", "go", "si", "pa", "ni"],
    description:
      "Once individual sounds are secure, children learn to blend two phonemes together — the first step toward reading real words.",
    color: "from-purple-500 to-purple-600",
    light: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    phase: "Phase 3",
    title: "Blending & Decoding Words",
    sounds: ["sat", "pin", "man", "dog", "stop", "drip", "flag", "trip"],
    description:
      "Children apply their phonics knowledge to decode complete words — the breakthrough moment that unlocks independent reading.",
    color: "from-primary to-primary-800",
    light: "bg-primary-50 text-primary border-primary-200",
  },
];

const principles = [
  {
    icon: "🎯",
    title: "Sequential & Cumulative",
    description:
      "Each sound builds on those already learned. We never skip ahead — mastery at each stage is the foundation for the next.",
  },
  {
    icon: "🔁",
    title: "Repeated Practice",
    description:
      "Children revisit and review sounds constantly through varied games. Spaced repetition creates lasting memory.",
  },
  {
    icon: "👂",
    title: "Explicit & Systematic",
    description:
      "Sounds are taught directly and deliberately. Nothing is left to chance or assumed knowledge.",
  },
  {
    icon: "🌍",
    title: "isiXhosa First",
    description:
      "Our programme teaches in isiXhosa — children's home language — ensuring comprehension and strong early foundations.",
  },
];

export default function StructuredLiteracySection() {
  return (
    <section className="py-20 bg-primary text-white overflow-hidden relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="container max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-white/70">
              What We Teach
            </span>
            <div className="w-8 h-1 bg-accent-yellow" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Structured Literacy
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            We teach letter sounds in a carefully designed sequence — from
            single phonemes through to full word decoding — giving every child a
            rock-solid phonics foundation.
          </p>
        </div>

        {/* Phase progression */}
        <div className="space-y-6 mb-16">
          {soundGroups.map((group, idx) => (
            <div
              key={group.phase}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-shrink-0">
                  <div
                    className={`inline-flex items-center gap-2 bg-gradient-to-r ${group.color} px-4 py-1.5 rounded-full text-sm font-bold mb-2`}
                  >
                    {group.phase}
                  </div>
                  <h3 className="text-xl font-bold">{group.title}</h3>
                  <p className="text-white/70 text-sm mt-1 max-w-xs">
                    {group.description}
                  </p>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    {group.sounds.map((sound) => (
                      <span
                        key={sound}
                        className="inline-flex items-center justify-center min-w-[3rem] px-3 py-2 bg-white/20 hover:bg-accent-yellow hover:text-gray-900 rounded-lg font-mono font-bold text-lg transition-colors duration-200 cursor-default"
                      >
                        {sound}
                      </span>
                    ))}
                    <span className="inline-flex items-center text-white/40 text-sm px-2">
                      …and more
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Principles */}
        <div>
          <h3 className="text-center text-2xl font-bold mb-8 text-white/90">
            Grounded in Proven Principles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {principles.map((p) => (
              <div
                key={p.title}
                className="bg-white/10 rounded-xl p-6 hover:bg-white/15 transition-colors duration-200"
              >
                <div className="text-3xl mb-3">{p.icon}</div>
                <h4 className="font-bold mb-2">{p.title}</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
