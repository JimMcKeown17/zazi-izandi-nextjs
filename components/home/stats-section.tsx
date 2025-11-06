import { Users, School, BookOpen, TrendingUp } from "lucide-react";

const stats = [
  {
    icon: School,
    value: "50+",
    label: "Schools Reached",
    description: "Across South Africa",
  },
  {
    icon: Users,
    value: "5,000+",
    label: "Learners Supported",
    description: "Grade R & Grade 1",
  },
  {
    icon: BookOpen,
    value: "100+",
    label: "Teaching Assistants",
    description: "Trained & Active",
  },
  {
    icon: TrendingUp,
    value: "40%",
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
                <Icon className="h-12 w-12 mx-auto mb-4" />
                <div className="text-5xl font-bold mb-2">{stat.value}</div>
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