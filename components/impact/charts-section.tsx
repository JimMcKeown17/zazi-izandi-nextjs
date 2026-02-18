import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const charts = [
  {
    src: "/images/misc/2024_Letter_Improvement.png",
    alt: "Letters Known Improvement chart showing 193% improvement in letter knowledge, with baseline vs midline comparison for Grade 1 and Grade R",
    title: "Letters Known Improvement",
    description:
      "Placeholder — describe how children improved their letter knowledge by 193% and learned, on average, 8.5 new letters between baseline and midline assessments.",
  },
  {
    src: "/images/misc/Grade R Improvement.png",
    alt: "Grade R Improvement chart showing letter sounds known increasing from ~5 to ~11.5 in a 6-week pilot",
    title: "Grade R Pilot Results",
    description:
      "Placeholder — describe the 6-week Grade R pilot results showing letter sounds known more than doubling from beginning to end of the intervention.",
  },
  {
    src: "/images/results/ecd_egra_improvement_2025.png",
    alt: "ECD Centers: Initial vs Midline vs Endline Performance showing average letters correct growing from ~1.5 initial to ~7 midline to ~22 endline",
    title: "ECD Centres: Assessment Performance Over Time",
    description:
      "ECD centres showed improvement of 14.9 letters from midline to endline, with children progressing from near-zero letter knowledge to over 22 letters correct.",
  },
  {
    src: "/images/results/ecd_zero_letter_knowledge_2025.png",
    alt: "ECD zero letter knowledge reduction chart showing the percentage of children knowing zero letters decreasing over time",
    title: "ECD: Eliminating Zero Letter Knowledge",
    description:
      "Placeholder — describe how the proportion of ECD children with zero letter knowledge was dramatically reduced through the intervention.",
  },
];

export default function ChartsSection() {
  return (
    <section className="bg-gray-50">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Data Portal
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Evidence from the Data
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Charts and visualizations from our assessment data showing
            measurable literacy gains across schools.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary-800 text-white"
          >
            <a
              href="https://data.zazi-izandi.co.za"
              target="_blank"
              rel="noopener noreferrer"
            >
              Enter Data Portal
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {charts.map((chart, index) => (
            <div
              key={index}
              className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-100"
            >
              <div className="p-6 pb-4">
                <Image
                  src={chart.src}
                  alt={chart.alt}
                  width={800}
                  height={500}
                  className="w-full h-auto rounded-lg"
                />
              </div>
              <div className="px-6 pb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {chart.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {chart.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
