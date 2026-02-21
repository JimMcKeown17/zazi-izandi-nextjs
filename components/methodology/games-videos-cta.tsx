import Link from "next/link";

export default function GamesVideosCta() {
  return (
    <section className="py-16 bg-primary text-white">
      <div className="container max-w-3xl text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-8 h-1 bg-accent-yellow" />
          <span className="text-sm font-semibold uppercase tracking-widest text-white/70">
            In the Classroom
          </span>
          <div className="w-8 h-1 bg-accent-yellow" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Games &amp; Activities
        </h2>
        <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
          Every session includes games designed to make letter-sound practice
          something children genuinely look forward to. Watch them in action on
          our Media page.
        </p>
        <Link
          href="/media#videos"
          className="inline-block px-8 py-3 rounded-lg bg-accent-yellow text-primary font-bold hover:bg-yellow-400 transition-colors"
        >
          Watch the Games Videos
        </Link>
      </div>
    </section>
  );
}
