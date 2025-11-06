import Link from "next/link";
import { ArrowRight, BookOpen, Map, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background - You'll add the actual video file later */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-900 z-0">
        {/* Placeholder for video background */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Content */}
      <div className="container relative z-10 text-white text-center py-20">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fadeIn">
          Zazi iZandi
        </h1>
        <p className="text-xl md:text-2xl lg:text-3xl mb-4 animate-fadeIn">
          Data-Driven Early Literacy Intervention
        </p>
        <p className="text-lg md:text-xl max-w-3xl mx-auto mb-12 animate-fadeIn">
          Empowering Foundation Phase learners across South African schools
          through evidence-based reading interventions and comprehensive data
          analysis.
        </p>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 animate-slideInLeft">
            <BookOpen className="h-8 w-8 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">Evidence-Based</h3>
            <p className="text-sm">
              Research-backed literacy interventions proven to improve reading outcomes
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 animate-fadeIn">
            <TrendingUp className="h-8 w-8 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">Data-Driven</h3>
            <p className="text-sm">
              Real-time tracking and assessment to measure progress and impact
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 animate-slideInRight">
            <Map className="h-8 w-8 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">Scalable</h3>
            <p className="text-sm">
              Successfully implemented across multiple schools and communities
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-primary hover:bg-gray-100 text-lg px-8"
          >
            <Link href="/about">
              Learn About Our Program
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white hover:text-primary text-lg px-8"
          >
            <Link href="/impact">
              View Our Impact
            </Link>
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2"></div>
        </div>
      </div>
    </section>
  );
}