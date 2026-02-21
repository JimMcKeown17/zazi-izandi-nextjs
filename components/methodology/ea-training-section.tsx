import Image from "next/image";
import { CheckCircle } from "lucide-react";

const trainingModules = [
  {
    title: "Phonics Foundations",
    description:
      "Deep understanding of letter-sound relationships, common confusions, and how to model sounds accurately.",
  },
  {
    title: "Small Group Facilitation",
    description:
      "How to manage groups of 6-8 children, maintain engagement, and handle different paces within one group.",
  },
  {
    title: "Assessment Techniques",
    description:
      "One-on-one assessment protocols that quickly identify each child's level with precision and consistency.",
  },
  {
    title: "Games & Activities",
    description:
      "A full toolkit of structured games that make practice joyful — EAs learn how to run each game with confidence.",
  },
  {
    title: "Data Recording",
    description:
      "Simple, fast methods for recording progress in real time so the data is always current and actionable.",
  },
  {
    title: "Classroom Partnership",
    description:
      "How to work alongside the class teacher as a professional partner, not just a helper.",
  },
];

const groupModel = [
  { label: "6–8", sublabel: "children per group" },
  { label: "Daily", sublabel: "structured sessions" },
  { label: "30 min", sublabel: "focused learning time" },
  { label: "In-class", sublabel: "within school hours" },
];

export default function EATrainingSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container max-w-6xl">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Our People
            </span>
            <div className="w-8 h-1 bg-accent-yellow" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Training Education Assistants
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We recruit unemployed young people from the communities we serve and
            transform them into skilled literacy practitioners — trained,
            supported, and supervised to deliver results.
          </p>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-20">
          {/* Left: training modules */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              What Our Training Covers
            </h3>
            <div className="space-y-4">
              {trainingModules.map((module) => (
                <div
                  key={module.title}
                  className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-200"
                >
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{module.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {module.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: model stats + image */}
          <div className="space-y-8">
            {/* Small group model */}
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-8 border border-primary-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                The Small Group Model
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {groupModel.map((item) => (
                  <div
                    key={item.label}
                    className="bg-white rounded-xl p-4 text-center shadow-sm"
                  >
                    <div className="text-3xl font-bold text-primary mb-1">
                      {item.label}
                    </div>
                    <div className="text-sm text-gray-500">{item.sublabel}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-6 leading-relaxed">
                Sessions take place inside the regular classroom during school
                hours. While the class teacher works with the rest of the class,
                the EA runs focused small-group sessions with children at
                similar levels.
              </p>
            </div>

            {/* Photo */}
            <div className="relative rounded-2xl overflow-hidden h-64 shadow-lg">
              <Image
                src="/images/gallery/Gallery 7.png"
                alt="Education Assistant training session"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-sm font-medium">
                  Education Assistants are trained, supervised, and continuously
                  supported throughout the programme year.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Highlight quote */}
        <div className="bg-primary rounded-2xl p-10 text-white text-center max-w-4xl mx-auto">
          <div className="text-5xl font-bold text-accent-yellow mb-2">
            &ldquo;
          </div>
          <p className="text-xl md:text-2xl font-light leading-relaxed mb-6">
            Our Education Assistants are young people from the same communities
            as the children they teach. That shared context — shared language,
            shared culture — makes them uniquely effective.
          </p>
          <div className="w-16 h-0.5 bg-accent-yellow mx-auto" />
        </div>
      </div>
    </section>
  );
}
