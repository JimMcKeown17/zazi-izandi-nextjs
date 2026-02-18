import { CheckCircle } from "lucide-react";

const years = [
  {
    year: "YEAR",
    title: "Placeholder Title",
    highlights: [
      "Placeholder highlight 1",
      "Placeholder highlight 2",
      "Placeholder highlight 3",
    ],
    stat: "PLACEHOLDER",
    statLabel: "Placeholder stat label",
    isCurrent: false,
  },
  {
    year: "YEAR",
    title: "Placeholder Title",
    highlights: [
      "Placeholder highlight 1",
      "Placeholder highlight 2",
      "Placeholder highlight 3",
    ],
    stat: "PLACEHOLDER",
    statLabel: "Placeholder stat label",
    isCurrent: false,
  },
  {
    year: "YEAR",
    title: "Placeholder Title",
    highlights: [
      "Placeholder highlight 1",
      "Placeholder highlight 2",
      "Placeholder highlight 3",
    ],
    stat: "PLACEHOLDER",
    statLabel: "Placeholder stat label",
    isCurrent: false,
  },
  {
    year: "YEAR",
    title: "Placeholder Title",
    highlights: [
      "Placeholder highlight 1",
      "Placeholder highlight 2",
      "Placeholder highlight 3",
    ],
    stat: "PLACEHOLDER",
    statLabel: "Placeholder stat label",
    isCurrent: true,
  },
];

export default function YearOverYearSection() {
  return (
    <section className="bg-primary-900 text-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-accent-yellow">
              Year-over-Year Progress
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Growing Impact, Year After Year
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            From a small pilot to a province-wide programme — our trajectory of
            growth and deepening impact.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative max-w-4xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />

          <div className="space-y-12">
            {years.map((item, index) => (
              <div
                key={index}
                className={`relative flex flex-col md:flex-row items-start gap-8 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Timeline dot */}
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                      item.isCurrent
                        ? "bg-accent-yellow text-gray-900"
                        : "bg-white/20 text-white border-2 border-white/40"
                    }`}
                  >
                    {item.year}
                  </div>
                </div>

                {/* Spacer for the dot column */}
                <div className="hidden md:block md:w-1/2" />

                {/* Card */}
                <div className="ml-16 md:ml-0 md:w-1/2">
                  <div
                    className={`rounded-xl p-6 ${
                      item.isCurrent
                        ? "bg-accent-yellow text-gray-900"
                        : "bg-white/10"
                    }`}
                  >
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <ul className="space-y-2 mb-4">
                      {item.highlights.map((highlight, hIndex) => (
                        <li key={hIndex} className="flex items-start gap-2">
                          <CheckCircle
                            className={`h-5 w-5 shrink-0 mt-0.5 ${
                              item.isCurrent
                                ? "text-primary"
                                : "text-accent-yellow"
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              item.isCurrent ? "text-gray-800" : "text-white/80"
                            }`}
                          >
                            {highlight}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div
                      className={`inline-block rounded-lg px-4 py-2 ${
                        item.isCurrent
                          ? "bg-primary text-white"
                          : "bg-white/10"
                      }`}
                    >
                      <span className="text-2xl font-bold">{item.stat}</span>
                      <span
                        className={`text-sm ml-2 ${
                          item.isCurrent ? "text-white/80" : "text-white/60"
                        }`}
                      >
                        {item.statLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
