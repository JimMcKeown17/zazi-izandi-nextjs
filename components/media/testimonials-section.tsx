import Image from "next/image";
import { Quote } from "lucide-react";

const testimonials = [
  {
    image: "/images/children/child_Lulo_2-13.jpg",
    name: "Lulo's Story",
    role: "Grade 1 Learner",
    quote:
      "When Lulo started the program, he could not identify a single letter sound. After just two terms with his Education Assistant, he was reading simple isiXhosa sentences with confidence and excitement.",
  },
  {
    image: "/images/children/child_Mbali_0-16.jpg",
    name: "Mbali's Journey",
    role: "Grade R Learner",
    quote:
      "Mbali's teacher noticed a complete transformation. She went from being withdrawn during reading time to eagerly raising her hand. The structured small-group sessions gave her the confidence she needed.",
  },
  {
    image: "/images/children/child_Qhamani_2-14.jpg",
    name: "Qhamani's Progress",
    role: "Grade 2 Learner",
    quote:
      "Qhamani's mother says he now reads signs on the street, labels at the shop, and even tries to read her messages. The program didn't just teach him to read — it made reading part of his life.",
  },
  {
    image: "/images/children/child_Yonela_5-12.jpg",
    name: "Yonela's Achievement",
    role: "Grade 1 Learner",
    quote:
      "Yonela improved from recognizing 2 letter sounds to 15 in a single term. Her Education Assistant worked with her three times a week in small groups, using phonics games and structured reading activities.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="bg-gradient-to-b from-primary-50 to-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Stories of Impact
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Changing Lives, One Reader at a Time
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Every child in our program has a story. Here are just a few of the
            learners whose lives have been transformed through Zazi iZandi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {testimonials.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100 flex gap-5"
            >
              <div className="shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-accent-yellow shadow-md">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <Quote className="h-6 w-6 text-accent-yellow mb-2" />
                <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">
                  {item.quote}
                </p>
                <div>
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <p className="text-sm text-primary">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
