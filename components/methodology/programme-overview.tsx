const steps = [
  {
    number: "01",
    title: "Assess Every Child",
    description:
      "Each learner is assessed individually to identify exactly which letter sounds they know and which they don't. No child is left behind.",
    color: "bg-primary",
  },
  {
    number: "02",
    title: "Group by Level",
    description:
      "Children are placed in small groups of 6-8 based on their current knowledge level, following the Teaching at the Right Level (TaRL).",
    color: "bg-primary-700",
  },
  {
    number: "03",
    title: "Teach Sounds in Order",
    description:
      "Education Assistants use structured, sequential lessons to teach letter sounds systematically. A group only moves forward once mastery is achieved.",
    color: "bg-primary-800",
  },
  {
    number: "04",
    title: "Play, Practice & Progress",
    description:
      "Lessons are delivered through games and activities that keep children engaged and motivated, making daily practice something learners look forward to.",
    color: "bg-primary-900",
  },
  {
    number: "05",
    title: "Measure & Adapt",
    description:
      "Ongoing assessments track every child's progress in real time. Data is used to reassign groups, adjust lessons, and ensure no learner stagnates.",
    color: "bg-primary",
  },
  {
    number: "06",
    title: "Blend, Decode & Read",
    description:
      "Once letter sounds are mastered, children advance to blending and decoding — the critical bridge between knowing sounds and reading real words.",
    color: "bg-primary-700",
  },
];

export default function ProgrammeOverview() {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              The Programme
            </span>
            <div className="w-8 h-1 bg-accent-yellow" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Six steps that transform a child&apos;s relationship with reading —
            delivered every day inside public school classrooms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-primary-200"
            >
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-full ${step.color} text-white font-bold text-xl mb-5`}
              >
                {step.number}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-yellow rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
