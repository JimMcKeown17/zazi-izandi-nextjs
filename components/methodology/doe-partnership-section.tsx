import Image from "next/image";
import { Building2, Scale, Users, MapPin } from "lucide-react";

const partnershipBenefits = [
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
    icon: MapPin,
    title: "Supporting the Curriculum",
    description:
      "Our laser focus on children in Grades R & 1 achieving letter sound mastering enables teachers to progress through their curriculum with confidence.",
  },
];

export default function DoEPartnershipSection() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Subtle stripe pattern to distinguish from sections above/below */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%232c5aa0\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")',
        }}
      />
      <div className="container max-w-6xl relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
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
            We don&apos;t work around the system. We work inside it — in
            partnership with the Eastern Cape Department of Education to deliver
            impact at scale through public schools.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {partnershipBenefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="flex gap-5 p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Why it matters banner */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-800" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          />
          <div className="relative z-10 p-10 md:p-14">
            <div className="grid md:grid-cols-3 gap-10 items-center">
              <div className="md:col-span-2 text-white">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Why a Government Partnership Matters
                </h3>
                <p className="text-white/85 leading-relaxed mb-4">
                  South Africa has millions of children in public schools who
                  cannot read. No NGO can solve this alone. By designing our
                  programme to work within and through the government school
                  system, we create the conditions for lasting, system-wide
                  change.
                </p>
                <p className="text-white/85 leading-relaxed">
                  Our partnership with the EC DoE means access, credibility, and
                  a pathway to scale — so that what works in one school can
                  reach thousands.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="bg-white/15 rounded-xl p-5 text-white text-center">
                  <div className="text-4xl font-bold text-accent-yellow mb-1">
                    250+
                  </div>
                  <div className="text-sm text-white/80">Public schools reached</div>
                </div>
                <div className="bg-white/15 rounded-xl p-5 text-white text-center">
                  <div className="text-4xl font-bold text-accent-yellow mb-1">
                    EC DoE
                  </div>
                  <div className="text-sm text-white/80">Government partner</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
