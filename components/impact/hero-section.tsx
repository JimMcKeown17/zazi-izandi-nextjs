import { Users, School, BookOpen, Target } from "lucide-react";

const heroStats = [
  {
    icon: School,
    value: "250+",
    label: "Schools Reached",
    description: "in Eastern Cape",
  },
  {
    icon: Users,
    value: "25,000+",
    label: "Learners Supported",
    description: "ECD, Grade R & Grade 1",
  },
  {
    icon: BookOpen,
    value: "500+",
    label: "Teaching Assistants",
    description: "Trained & Active",
  },
  {
    icon: Target,
    value: "2x",
    label: "Hitting Benchmark",
    description: "In Each Classroom",
  },
];

export default function ImpactHeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primary-700 to-primary-900 text-white py-24 overflow-hidden">
      {/* Dot pattern overlay */}
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
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fadeIn">
            Our Impact
          </h1>
          <p className="text-xl md:text-2xl text-white/90">
            Data-driven evidence of how Zazi iZandi is transforming early
            literacy outcomes in the Eastern Cape.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {heroStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                <Icon className="h-10 w-10 mx-auto mb-3 text-accent-yellow" />
                <div className="text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-lg font-semibold mb-1">{stat.label}</div>
                <div className="text-sm text-white/70">{stat.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
