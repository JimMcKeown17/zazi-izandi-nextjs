import Image from "next/image";
import { BarChart3, RefreshCw, Target, TrendingUp } from "lucide-react";

const dataFeatures = [
  {
    icon: Target,
    title: "Individual Tracking",
    description:
      "Every child's letter-sound knowledge is tracked at the individual level. We know precisely which sounds each learner has mastered and which need more work.",
  },
  {
    icon: RefreshCw,
    title: "Dynamic Grouping",
    description:
      "Assessment data drives group composition. As children progress, groups are updated to ensure everyone is always learning at the right level.",
  },
  {
    icon: BarChart3,
    title: "Programme-Wide Dashboards",
    description:
      "Coordinators and funders can see aggregate data across all schools and EAs in real time — enabling rapid identification of where support is needed.",
  },
  {
    icon: TrendingUp,
    title: "Year-on-Year Improvement",
    description:
      "Data from each cohort informs the design of the next. Our programme gets measurably better every year because we measure everything.",
  },
];

export default function DataDrivenSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: images */}
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden h-72 shadow-lg">
              <Image
                src="/images/misc/Data-Driven Photo 1.png"
                alt="Data-driven assessment in action"
                fill
                className="object-cover"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative rounded-xl overflow-hidden h-40 shadow-md">
                <Image
                  src="/images/misc/Data-Driven Photo 2.png"
                  alt="EA recording child progress"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative rounded-xl overflow-hidden h-40 shadow-md bg-primary-50 flex items-center justify-center p-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-1">
                    100%
                  </div>
                  <div className="text-sm text-gray-600">
                    of children individually tracked
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: content */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-1 bg-accent-yellow" />
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                Data & Evidence
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              A Data-Driven Programme
            </h2>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              We don&apos;t guess. We measure. Every assessment, every group
              change, every lesson is informed by real data — collected in
              classrooms and fed back to coordinators in real time.
            </p>

            <div className="space-y-6">
              {dataFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-0.5">
                        {feature.title}
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-5 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl">
              <p className="text-sm text-gray-700">
                <strong>Benchmark:</strong> We track children&apos;s performance
                against the Wordworks letter-sound benchmark for Grade 1
                learners in the Eastern Cape — giving an independent measure of
                whether our programme is working.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
