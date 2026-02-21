const programmeVideos = [
  {
    videoId: "FQKUQ0hrvSc",
    title: "Zazi iZandi: Igniting Young Minds",
    description: "Official short feature film",
  },
  {
    videoId: "GsLPCxvZaEs",
    title: "Prof Brahm Fleisch on the Data",
    description: "Leading education researcher unpacks what the numbers show",
  },
  {
    videoId: "-9uOn3q2Ml0",
    title: "The Full Feature Film",
    description: "An in-depth look at the programme and the children it reaches",
  },
  {
    videoId: "dmqxmZIELXo",
    title: "Inside Zazi iZandi Training",
    description: "Preparing youth to transform classrooms",
  },
];

const gamesVideos = [
  {
    videoId: "u_GDY5gnBUM",
    title: "Board Game",
    description:
      "Children race along a board, naming letter sounds — combining movement and repetition to build sound automaticity.",
  },
  {
    videoId: "Q3hzmqEFO6M",
    title: "Snap",
    description:
      "A fast-paced card game where learners race to match letter sounds, building rapid recognition.",
  },
  {
    videoId: "A82dce50QFo",
    title: "Memory Game",
    description:
      "Pairs of letter-sound cards laid face down. Children flip and match, reinforcing sound recall.",
  },
  {
    videoId: "mwM964mnTCk",
    title: "Container Game",
    description:
      "Letter cards sorted into containers by sound — a hands-on categorisation activity that deepens phonemic awareness.",
  },
  {
    videoId: "5PqOMfRyRhI",
    title: "Writing Letters",
    description:
      "Children practise forming letters by hand, connecting the visual symbol to its sound.",
  },
  {
    videoId: "cIYtgH07-fg",
    title: "Hopscotch",
    description:
      "A hopscotch grid labelled with letter sounds — children jump and call out sounds, making literacy active.",
  },
];

function VideoCard({
  videoId,
  title,
  description,
}: {
  videoId: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/10 rounded-2xl overflow-hidden hover:bg-white/15 transition-colors duration-300">
      <div className="aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
      <div className="p-4">
        <p className="font-semibold text-white text-sm leading-snug">{title}</p>
        <p className="text-white/60 text-xs mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function AllVideosSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary-800 via-primary-900 to-gray-950 py-20 overflow-hidden">
      {/* Dot texture */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_40%,rgba(44,90,160,0.35),transparent)]" />

      <div id="videos" className="container relative z-10">

        {/* Programme Videos */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-1 bg-accent-yellow" />
            <h3 className="text-sm font-semibold uppercase tracking-widest text-accent-yellow">
              Programme Videos
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {programmeVideos.map((v) => (
              <VideoCard key={v.videoId} {...v} />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-16">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs uppercase tracking-widest font-medium">
            In the Classroom
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Games & Activities */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-1 bg-accent-yellow" />
            <h3 className="text-sm font-semibold uppercase tracking-widest text-accent-yellow">
              Games &amp; Activities
            </h3>
          </div>
          <p className="text-white/60 text-sm max-w-2xl mb-8">
            Every game our Education Assistants run is designed to make daily
            letter-sound practice something children genuinely look forward to.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gamesVideos.map((v) => (
              <VideoCard key={v.videoId} {...v} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
