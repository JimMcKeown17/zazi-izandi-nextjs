import Link from "next/link";
import { Building2, Scale, Users, BookOpen } from "lucide-react";

const benefits = [
  {
    icon: Building2,
    title: "Inside Public Schools",
    description:
      "We work within existing public school infrastructure, not alongside it. No new buildings, no separate locations, no setup or infrastructure costs.",
  },
  {
    icon: Users,
    title: "Alongside Teachers",
    description:
      "Education Assistants work as partners to the class teacher, not replacements. This adds capacity rather than replacing the existing system.",
  },
  {
    icon: Scale,
    title: "Built to Scale",
    description:
      "The model is designed to grow. By embedding in the DoE system and training community youth, we can expand to hundreds of schools without creating a parallel system.",
  },
  {
    icon: BookOpen,
    title: "Supporting the Curriculum",
    description:
      "Our laser focus on children in Grades R & 1 achieving letter sound mastery enables teachers to progress through their curriculum with confidence.",
  },
];

export default function HomeDoEPartnershipSection() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Subtle stripe texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%232c5aa0\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <div className="container max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Scalable by Design
            </span>
            <div className="w-8 h-1 bg-accent-yellow" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Partnership with the{" "}
            <span className="text-primary">Department of Education</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We don&apos;t work around the system — we work inside it. In
            partnership with the Eastern Cape DoE, delivering impact at scale
            through public schools.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{benefit.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Dark banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-primary-800 p-8 md:p-12">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-white text-center md:text-left">
              <p className="text-xl md:text-2xl font-bold mb-2">
                What works in one school can reach thousands.
              </p>
              <p className="text-white/75">
                Our government partnership is the foundation for nationwide scale.
              </p>
            </div>
            <div className="flex gap-6 flex-shrink-0">
              <div className="text-center">
                <div className="text-4xl font-bold text-accent-yellow">250+</div>
                <div className="text-white/70 text-sm mt-0.5">Schools reached</div>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <div className="text-4xl font-bold text-accent-yellow">EC DoE</div>
                <div className="text-white/70 text-sm mt-0.5">Government partner</div>
              </div>
            </div>
          </div>
        </div>

        {/* Link to methodology */}
        <div className="text-center mt-10">
          <Link
            href="/methodology"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-800 transition-colors duration-200"
          >
            Learn more about our methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
