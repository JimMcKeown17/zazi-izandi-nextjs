import Image from "next/image";

export default function BenchmarkSection() {
  return (
    <section className="bg-gradient-to-b from-primary-50 to-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Reading Benchmarks
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Exceeding National Benchmarks
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Zazi iZandi learners consistently outperform national averages in
            Foundation Phase reading assessments.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Programme Impact Chart */}
          <div>
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-accent-yellow rounded-lg z-0" />
              <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl bg-white p-6">
                <Image
                  src="/images/programme-impact-2024.svg"
                  alt="Bar chart showing Grade 1 learners benchmark achievement: 13% at start of year, 27% national average end of year, and 53% Zazi iZandi end of year"
                  width={565}
                  height={554}
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-14 h-14 bg-primary/10 rounded-lg z-0" />
            </div>
          </div>

          {/* Explanation */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Doubling the Number of Children Hitting Benchmark
            </h3>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              In 6 months, Zazi iZandi doubles the number of children hitting
              the Grade 1 benchmark of 40 letters correct per minute. Research
              by Nik Spaull indicates this is highly correlated with becoming a
              future reader in Grades 3 &amp; 4.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
