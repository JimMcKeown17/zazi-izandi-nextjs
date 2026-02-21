const games = [
  {
    title: "Board Game",
    description: "Children race along a board, naming letter sounds as they go — combining movement and repetition to build sound automaticity.",
    videoId: "u_GDY5gnBUM",
  },
  {
    title: "Snap",
    description: "A fast-paced card game where learners race to match letter sounds — building rapid recognition and keeping energy high.",
    videoId: "Q3hzmqEFO6M",
  },
  {
    title: "Memory Game",
    description: "Pairs of letter-sound cards are laid face down. Children flip and match, reinforcing sound recall through repeated exposure.",
    videoId: "A82dce50QFo",
  },
  {
    title: "Container Game",
    description: "Letter cards are sorted into containers by sound — a hands-on categorisation activity that deepens phonemic awareness.",
    videoId: "mwM964mnTCk",
  },
  {
    title: "Writing Letters",
    description: "Children practise forming letters by hand, connecting the visual symbol to the sound and embedding it through motor memory.",
    videoId: "5PqOMfRyRhI",
  },
  {
    title: "Hopscotch",
    description: "A physical hopscotch grid labelled with letter sounds — children jump and call out sounds, making literacy literally active.",
    videoId: "cIYtgH07-fg",
  },
];

export default function GamesVideosSection() {
  return (
    <section className="py-20 bg-primary text-white relative overflow-hidden">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="container max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-white/70">
              In the Classroom
            </span>
            <div className="w-8 h-1 bg-accent-yellow" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Games &amp; Activities
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Learning to read should be joyful. Every game our Education
            Assistants run is designed to make daily letter-sound practice
            something children genuinely look forward to.
          </p>
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game) => (
            <div
              key={game.title}
              className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/15 transition-all duration-300 group"
            >
              {/* Video embed */}
              <div className="aspect-video bg-black/30">
                <iframe
                  src={`https://www.youtube.com/embed/${game.videoId}`}
                  title={game.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {/* Card content */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-accent-yellow flex-shrink-0" />
                  <h3 className="font-bold text-lg">{game.title}</h3>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  {game.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-white/50 text-sm mt-12">
          All games are facilitated by trained Education Assistants in small
          groups during daily 30-minute sessions within the regular school day.
        </p>
      </div>
    </section>
  );
}
