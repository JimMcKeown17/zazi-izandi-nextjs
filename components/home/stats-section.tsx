import { Users, School, BookOpen, TrendingUp } from "lucide-react";

const stats = [
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
    icon: TrendingUp,
    value: "45%",
    label: "Improvement",
    description: "In reading benchmarks",
  },
];

export default function StatsSection() {
  return (
    <section className="py-20 bg-primary text-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Our Impact in Numbers
          </h2>
          <div className="w-12 h-1 bg-accent-yellow mx-auto mb-5" />
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Real results from our data-driven approach to early literacy intervention
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                <Icon className="h-12 w-12 mx-auto mb-4 text-accent-yellow" />
                <div className="text-5xl font-bold mb-2 relative inline-block">
                  {stat.value}
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent-yellow/60 rounded-full" />
                </div>
                <div className="text-xl font-semibold mb-1">{stat.label}</div>
                <div className="text-sm text-white/80">{stat.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}