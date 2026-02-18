import { Play } from "lucide-react";

const videos = [
  {
    id: "placeholder-1",
    title: "Zazi iZandi: Teaching Children to Read",
    description:
      "An overview of the Zazi iZandi early literacy program and its impact on Foundation Phase learners in the Eastern Cape.",
    thumbnail: "/images/misc/Placeholder 1.jpg",
  },
  {
    id: "placeholder-2",
    title: "Education Assistants in Action",
    description:
      "Watch our trained Education Assistants working with small groups, using structured lesson plans to build reading fluency.",
    thumbnail: "/images/misc/Placeholder 2.jpg",
  },
  {
    id: "placeholder-3",
    title: "Community Voices: Parents Speak",
    description:
      "Parents from Joe Slovo Township share how Zazi iZandi has changed their children's relationship with reading.",
    thumbnail: "/images/misc/Placeholder 3.jpg",
  },
];

export default function VideoSection() {
  return (
    <section className="bg-primary-900 text-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-accent-yellow">
              Videos
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            See Our Work in Action
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Videos showcasing the Zazi iZandi program, our Education Assistants,
            and the communities we serve.
          </p>
        </div>

        {/* Featured video */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="rounded-xl overflow-hidden shadow-2xl aspect-video bg-gray-800 relative group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="w-20 h-20 bg-accent-yellow rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Play className="h-8 w-8 text-primary ml-1" fill="currentColor" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
              <h3 className="text-2xl font-bold mb-2">{videos[0].title}</h3>
              <p className="text-white/80">{videos[0].description}</p>
            </div>
            {/* Placeholder background */}
            <div className="w-full h-full bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center">
              <span className="text-white/20 text-sm">Video Placeholder</span>
            </div>
          </div>
        </div>

        {/* Secondary videos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {videos.slice(1).map((video) => (
            <div
              key={video.id}
              className="rounded-xl overflow-hidden shadow-lg bg-white/5 group cursor-pointer hover:bg-white/10 transition-colors"
            >
              <div className="aspect-video bg-gray-800 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 bg-accent-yellow/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play
                      className="h-6 w-6 text-primary ml-0.5"
                      fill="currentColor"
                    />
                  </div>
                </div>
                <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                  <span className="text-white/20 text-sm">
                    Video Placeholder
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold mb-2">{video.title}</h3>
                <p className="text-white/60 text-sm">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
