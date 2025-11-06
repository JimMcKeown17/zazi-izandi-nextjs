import Link from "next/link";
import { ArrowRight, Users, MapPin, BookOpen, BarChart3, Award, Image } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: Users,
    title: "About Zazi iZandi",
    description: "Discover our journey, mission, and the story behind our data-driven approach to early literacy.",
    href: "/about",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: MapPin,
    title: "Where We Work",
    description: "Explore the schools and communities where we're making a difference across South Africa.",
    href: "/schools",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: BookOpen,
    title: "Our Methodology",
    description: "Learn about our teaching approach, training materials, and evidence-based interventions.",
    href: "/methodology",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: BarChart3,
    title: "Impact & Results",
    description: "See the measurable outcomes and data showing how we're improving literacy rates.",
    href: "/impact",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    icon: Image,
    title: "Media & Gallery",
    description: "View photos, videos, and stories from our classrooms and communities.",
    href: "/media",
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    icon: Award,
    title: "Resources",
    description: "Access our open-source teaching materials, guides, games, and datasets.",
    href: "/resources",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
];

export default function OverviewSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            Explore Our Program
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Learn more about our comprehensive approach to improving early literacy
            outcomes for Foundation Phase learners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.href}
                className="hover:shadow-xl transition-shadow duration-300 border-t-4 border-primary"
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${section.color}`} />
                  </div>
                  <CardTitle className="text-2xl">{section.title}</CardTitle>
                  <CardDescription className="text-base">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="ghost" className="group">
                    <Link href={section.href}>
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}