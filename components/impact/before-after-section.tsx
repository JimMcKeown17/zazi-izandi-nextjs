import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function BeforeAfterSection() {
  return (
    <section className="bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Early Childhood Development
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Building Foundations from Age 3
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Zazi iZandi is effective with 3–5 year old children too — not just
            Grade R and Grade 1. Early intervention builds the letter-sound
            knowledge that unlocks reading.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: narrative + baseline/endline cards */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              ECD Letter Knowledge Growth
            </h3>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Children aged 3–5 in the Zazi iZandi programme show extraordinary
              gains in letter-sound knowledge, growing from near-zero to over 22
              letters correct per minute — proving that structured early literacy
              intervention works well before formal schooling begins.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Baseline */}
              <div className="flex-1 w-full text-center bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Baseline
                </div>
                <div className="text-5xl font-bold text-gray-400 mb-1">
                  1.7
                </div>
                <div className="text-sm text-gray-500">
                  letters correct per minute
                </div>
              </div>

              <ArrowRight className="h-6 w-6 text-accent-yellow shrink-0 rotate-90 sm:rotate-0" />

              {/* Endline */}
              <div className="flex-1 w-full text-center bg-primary-50 rounded-xl p-6 ring-2 ring-primary/20 border border-primary/10">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Endline
                </div>
                <div className="text-5xl font-bold text-primary mb-1">
                  22.1
                </div>
                <div className="text-sm text-gray-600">
                  letters correct per minute
                </div>
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 bg-accent-yellow text-gray-900 font-semibold px-5 py-2.5 rounded-full text-sm shadow-sm">
              <ArrowRight className="h-4 w-4" />
              +1,200% improvement in letter knowledge
            </div>
          </div>

          {/* Right: ECD chart */}
          <div className="relative">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent-yellow rounded-lg z-0" />
            <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl bg-white p-6">
              <Image
                src="/images/results/ecd_letter_knowledge_improvement.svg"
                alt="ECD letter knowledge improvement chart showing growth from 1.7 to 22.1 letters correct per minute for 3-5 year old children"
                width={600}
                height={500}
                className="w-full h-auto"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 w-14 h-14 bg-primary/10 rounded-lg z-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
