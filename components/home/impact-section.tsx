import Image from "next/image";
import { TrendingUp } from "lucide-react";

export default function ImpactSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left column */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-10 bg-accent-yellow" />
              <span className="text-sm font-semibold tracking-widest text-primary uppercase">
                Our Impact
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Data-Driven Intervention
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Zazi iZandi is data-driven, tracking progress and outcomes down to
              each individual child. By leveraging detailed analytics, we take a
              Teaching at the Right Level (TaRL) approach to ensure each child
              receives an effective learning experience.
            </p>
            <div className="inline-flex items-center gap-2 bg-accent-yellow text-gray-900 font-semibold px-6 py-3 rounded-full text-sm md:text-base shadow-sm self-start">
              <TrendingUp className="h-4 w-4 shrink-0" />
              In 2024, we doubled the number of children on reading level
            </div>
          </div>

          {/* Right column */}
          <div className="flex justify-center lg:justify-end">
            <Image
              src="/images/programme-impact-2024.svg"
              alt="Bar chart showing Grade 1 learners benchmark achievement: 13% at start of year, 27% national average end of year, and 53% Zazi iZandi end of year"
              width={565}
              height={554}
              className="w-full max-w-lg"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
