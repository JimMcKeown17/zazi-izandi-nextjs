import { Scale, Briefcase, Users, BarChart3 } from "lucide-react";

const pillars = [
  {
    icon: Scale,
    label: "Built to Scale with Government",
    description: "Embedded inside public schools in partnership with the DoE",
  },
  {
    icon: Briefcase,
    label: "Creating Employment",
    description: "Recruiting and training unemployed youth from local communities",
  },
  {
    icon: Users,
    label: "Teaching at the Right Level",
    description: "Every child grouped and taught at their actual level",
  },
  {
    icon: BarChart3,
    label: "Data-Driven",
    description: "Real-time assessment informing every lesson and group",
  },
];

export default function MethodologyHero() {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primary-700 to-primary-900 text-white overflow-hidden">
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="container relative z-10 py-20">
        {/* Top: two-column — text left, video right */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Left: text */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-1 bg-accent-yellow" />
              <span className="text-sm font-semibold uppercase tracking-widest text-white/70">
                How We Teach
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fadeIn">
              Our Methodology
            </h1>
            <p className="text-xl text-white/90 leading-relaxed">
              A structured, evidence-based approach that meets every child where
              they are — and takes them further than they imagined possible.
            </p>
          </div>

          {/* Right: video */}
          <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20 aspect-video">
            <iframe
              src="https://www.youtube.com/embed/dmqxmZIELXo"
              title="Zazi iZandi Training & Methodology"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Bottom: four pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.label}
                className="flex items-start gap-4 p-5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                <Icon className="h-7 w-7 text-accent-yellow flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold leading-snug mb-1">{pillar.label}</div>
                  <div className="text-sm text-white/70">{pillar.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
