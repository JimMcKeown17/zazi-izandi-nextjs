const featured = {
  videoId: "FQKUQ0hrvSc",
  title: "Zazi iZandi: Igniting Young Minds",
  description: "Official Short Feature Film",
};

const supporting = [
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

export default function VideoSection() {
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
      {/* Soft radial glow in centre */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_40%,rgba(44,90,160,0.35),transparent)]" />

      <div className="container relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="w-12 h-1 bg-accent-yellow mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Watch Zazi iZandi in Action
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            See how our Education Assistants work with children to build
            foundational literacy skills.
          </p>
        </div>

        {/* Featured video */}
        <div className="max-w-4xl mx-auto mb-4">
          <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 aspect-video">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${featured.videoId}`}
              title={featured.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="text-center mt-4">
            <p className="text-white font-semibold text-lg">{featured.title}</p>
            <p className="text-white/50 text-sm">{featured.description}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 max-w-4xl mx-auto my-10">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/40 text-sm uppercase tracking-widest font-medium">More Videos</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Supporting videos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {supporting.map((video) => (
            <div key={video.videoId}>
              <div className="rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10 aspect-video">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${video.videoId}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="mt-3">
                <p className="text-white font-semibold text-sm leading-snug">{video.title}</p>
                <p className="text-white/50 text-xs mt-0.5">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
