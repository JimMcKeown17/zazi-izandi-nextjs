import Image from "next/image";
import { ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const newsItems = [
  {
    image: "/images/news/In The News - President.png",
    title: "President Ramaphosa Visits Zazi iZandi Schools",
    source: "Office of the Presidency",
    date: "2024",
    excerpt:
      "President Cyril Ramaphosa recognized the Zazi iZandi early literacy program during a visit to Eastern Cape schools, highlighting it as a model for evidence-based education interventions across the country.",
    link: "#",
  },
  {
    image: "/images/news/In The News - President 2.png",
    title: "Presidential Recognition for Literacy Innovation",
    source: "Government Communications",
    date: "2024",
    excerpt:
      "The Zazi iZandi program received national attention for its measurable impact on Foundation Phase reading outcomes in under-resourced communities.",
    link: "#",
  },
  {
    image: "/images/news/In The News - Dispatch.png",
    title: "Local Literacy Program Shows Remarkable Results",
    source: "Daily Dispatch",
    date: "2023",
    excerpt:
      "A Daily Dispatch feature on how Zazi iZandi's structured phonics approach is transforming reading outcomes in Gqeberha township schools.",
    link: "#",
  },
];

export default function NewsSection() {
  return (
    <section className="bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-1 bg-accent-yellow" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              In the News
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Press & Media Coverage
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Zazi iZandi has been featured in national and local press for its
            impact on early literacy in the Eastern Cape.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {newsItems.map((item, index) => (
            <article
              key={index}
              className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-100"
            >
              <div className="aspect-[16/10] overflow-hidden relative">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={640}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>{item.date}</span>
                  <span className="mx-1">|</span>
                  <span className="font-medium text-primary">
                    {item.source}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {item.excerpt}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary-800 p-0 h-auto font-semibold"
                >
                  Read Article
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
