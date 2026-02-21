import Link from "next/link";

export default function MethodologyCTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container max-w-4xl text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-8 h-1 bg-accent-yellow" />
          <span className="text-sm font-semibold uppercase tracking-widest text-white/60">
            See It in Action
          </span>
          <div className="w-8 h-1 bg-accent-yellow" />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          The Results Speak for Themselves
        </h2>
        <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
          Our methodology is built on evidence and validated by data.
          Explore what it&apos;s achieving in classrooms across the Eastern Cape.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/impact"
            className="btn-primary inline-block text-center text-base"
          >
            View Our Impact
          </Link>
          <Link
            href="/resources"
            className="inline-block text-center px-6 py-3 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 transition-all duration-300"
          >
            Download Training Resources
          </Link>
        </div>
      </div>
    </section>
  );
}
