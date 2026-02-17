import Image from "next/image";
import { CheckCircle2, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const findings = [
  "A 45% improvement in children reaching the benchmark from 29% to 42%.",
  "Grade R's improved their letter sound knowledge by 100% while Grade 1s improved by 27%.",
  "With focused training and support, youth are able to improve reading outcomes with a relatively small dosage of training (2 days).",
  "There is great potential in providing a set of low cost LTSM at the level of the youth to work with learners in small groups.",
];

export default function ResearchSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Research photo with decorative accent */}
          <div className="relative">
            {/* Yellow accent block behind image */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-accent-yellow rounded-lg z-0" />
            <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl">
              <Image
                src="/images/misc/ZZ Research Photo.png"
                alt="Zazi iZandi research in action"
                width={640}
                height={480}
                className="w-full h-auto object-cover"
              />
            </div>
            {/* Bottom-right accent */}
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary/10 rounded-lg z-0" />

            {/* Research paper badge */}
            <div className="absolute bottom-6 left-6 z-20 bg-white rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-xs">
              <div className="bg-primary rounded-md p-2 shrink-0">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Advisory Note 04</p>
                <p className="text-sm font-semibold text-gray-800 leading-snug">
                  Zazi iZandi: Leveraging public employment to lay literacy foundations
                </p>
              </div>
            </div>
          </div>

          {/* Right — Content */}
          <div>
            {/* Section label */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-1 bg-accent-yellow" />
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                Research
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">
              Backed By Expert Research
            </h2>

            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Professor Brahm Fleisch from the University of the Witwatersrand,
              a leading education researcher in South Africa, conducted an
              important study on a pilot education program. His research offered
              a detailed evaluation of the program&apos;s effectiveness. The
              results, as presented in his report, are very positive.
            </p>

            {/* Findings list */}
            <ul className="space-y-4 mb-10">
              {findings.map((finding, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <p className="text-gray-700">{finding}</p>
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary-800 text-white font-semibold"
              >
                <a href="/downloads/Zazi iZandi Research Advisory Note.pdf" target="_blank" rel="noopener noreferrer">
                  Read the Brief
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-gray-300 text-gray-800 hover:border-primary hover:text-primary font-semibold"
              >
                <a
                  href="https://www.sciencedirect.com/science/article/pii/S2666374024000657"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the Report
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
