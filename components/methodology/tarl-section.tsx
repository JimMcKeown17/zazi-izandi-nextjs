import Image from "next/image";

const levels = [
  {
    label: "Beginner",
    emoji: "🌱",
    description: "Learning to recognise and name individual letter sounds",
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-800",
  },
  {
    label: "Developing",
    emoji: "🌿",
    description: "Consolidating sounds, building confidence, mastering entire alphabet",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    label: "Advancing",
    emoji: "🌳",
    description: "Building automaticity, hitting 40lcpm benchmark, learning digraphs",
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800",
  },
  {
    label: "Blending",
    emoji: "📖",
    description: "Blending letter sounds together to begin to form, decode, and read words.",
    bg: "bg-accent-yellow/10",
    border: "border-accent-yellow/40",
    badge: "bg-accent-yellow/30 text-yellow-900",
  },
];

export default function TaRLSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: content */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-1 bg-accent-yellow" />
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                Teaching at the Right Level
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Every Child Learns at{" "}
              <span className="text-primary">Their Level</span>
            </h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Most classroom instruction pitches to the middle, leaving behind
              the children who need the most support. We do the opposite.
            </p>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              Using the{" "}
              <strong>Teaching at the Right Level (TaRL)</strong> methodology, we assess
              every child individually and group them by their actual knowledge
              level, not their age or grade.
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-6">
              <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-2">
                Why this matters
              </p>
              <p className="text-gray-700">
                Letter sound knowledge is the single highest-correlated metric to future reading. Children that finish grade 1 without knowing their letter sounds rarely go on to become future readers.
              </p>
            </div>

            <p className="text-gray-600 text-sm italic">
              Groups are fluid — as children progress, they move up. As the
              data shows gaps, we adjust. The system is always responding.
            </p>
          </div>

          {/* Right: level cards */}
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-6">
              Learning Levels
            </p>
            {levels.map((level, i) => (
              <div
                key={level.label}
                className={`flex items-start gap-4 p-5 rounded-xl border ${level.bg} ${level.border} transition-transform hover:-translate-y-0.5 duration-200`}
              >
                <div className="text-3xl mt-0.5">{level.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${level.badge}`}
                    >
                      Level {i + 1}
                    </span>
                    <span className="font-bold text-gray-900">{level.label}</span>
                  </div>
                  <p className="text-sm text-gray-600">{level.description}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1 h-0.5 bg-gradient-to-r from-green-200 via-blue-200 to-accent-yellow" />
              <span className="text-xs text-gray-400 whitespace-nowrap">Progress →</span>
            </div>
          </div>
        </div>

        {/* Bottom image strip */}
        <div className="mt-20 grid grid-cols-3 gap-4">
          <div className="relative rounded-xl overflow-hidden h-48 shadow-md">
            <Image
              src="/images/gallery/Gallery 1.jpg"
              alt="Small group learning session"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative rounded-xl overflow-hidden h-48 shadow-md">
            <Image
              src="/images/gallery/Gallery 2.jpg"
              alt="Education Assistant working with children"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative rounded-xl overflow-hidden h-48 shadow-md">
            <Image
              src="/images/gallery/Gallery 4.jpg"
              alt="Children engaged in literacy activities"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
