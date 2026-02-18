import { Camera, Film, Newspaper } from "lucide-react";

export default function MediaHeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primary-700 to-primary-900 text-white py-24 overflow-hidden">
      {/* SVG dot pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        ></div>
      </div>

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fadeIn">
            Media & Stories
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-white/90">
            See the impact of Zazi iZandi through videos, news coverage, and
            stories from the communities we serve.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <Film className="h-10 w-10 mx-auto mb-3 text-accent-yellow" />
              <h3 className="font-bold text-lg">Videos</h3>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <Newspaper className="h-10 w-10 mx-auto mb-3 text-accent-yellow" />
              <h3 className="font-bold text-lg">In the News</h3>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <Camera className="h-10 w-10 mx-auto mb-3 text-accent-yellow" />
              <h3 className="font-bold text-lg">Gallery</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
