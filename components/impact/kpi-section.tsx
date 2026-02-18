import { ArrowRight } from "lucide-react";

const kpis = [
  {
    label: "Letter Knowledge",
    unit: "letters correct per minute",
    baseline: "13.6",
    endline: "37.9",
    changeLabel: "+179%",
    color: "border-primary",
    description:
      "Grade 1 learners nearly tripled their letter-sound fluency over the course of the programme.",
  },
  {
    label: "Hitting Benchmark",
    unit: "of children on benchmark",
    baseline: "13.1%",
    endline: "52.5%",
    changeLabel: "4x",
    color: "border-accent-yellow",
    description:
      "The proportion of Grade 1 learners meeting the reading benchmark quadrupled from baseline to endline.",
  },
  {
    label: "Zero-Letter Knowledge",
    unit: "of children knowing zero letters",
    baseline: "23.4%",
    endline: "1.3%",
    changeLabel: "-95%",
    color: "border-green-500",
    description:
      "Nearly every child who started knowing zero letter sounds gained measurable literacy by end of year.",
  },
  {
    label: "Word Reading",
    unit: "words read per minute",
    baseline: "8.3",
    endline: "13.9",
    changeLabel: "+68%",
    color: "border-accent-red",
    description:
      "Grade 1 learners improved their connected-text reading fluency significantly over the intervention period.",
  },
];

export default function KpiSection() {
  return (
    <section className="bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Grade 1 Key Metrics
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Measuring What Matters
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Four core metrics tracking real literacy gains for Grade 1 learners
            — from baseline to endline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className={`bg-white rounded-xl p-6 shadow-md border border-gray-100 border-l-4 ${kpi.color} hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{kpi.label}</h3>
                <span className="text-sm font-bold text-primary bg-primary-50 px-3 py-1 rounded-full">
                  {kpi.changeLabel}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                {/* Baseline */}
                <div className="flex-1 text-center bg-gray-50 rounded-lg p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Baseline
                  </div>
                  <div className="text-3xl font-bold text-gray-400">
                    {kpi.baseline}
                  </div>
                </div>

                <ArrowRight className="h-5 w-5 text-accent-yellow shrink-0" />

                {/* Endline */}
                <div className="flex-1 text-center bg-primary-50 rounded-lg p-4 ring-2 ring-primary/20">
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                    Endline
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {kpi.endline}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                {kpi.unit}
              </div>
              <p className="text-sm text-gray-600">{kpi.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
