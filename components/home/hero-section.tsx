import Link from "next/link";
import { ArrowRight, Briefcase, Target, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Content */}
      <div className="container relative z-10 text-white py-24 md:py-32">
        {/* Yellow accent bar */}
        <div className="w-16 h-1 bg-accent-yellow mb-8" />

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-10 max-w-2xl leading-tight animate-fadeIn">
          Teaching Children Their Letter Sounds
        </h1>

        {/* Feature bullets */}
        <ul className="space-y-4 mb-12 max-w-lg animate-fadeIn">
          <li className="flex items-center gap-4">
            <Briefcase className="h-5 w-5 shrink-0 text-accent-yellow" />
            <p className="text-lg font-semibold text-white">
              Creating local jobs
            </p>
          </li>
          <li className="flex items-center gap-4">
            <Target className="h-5 w-5 shrink-0 text-accent-yellow" />
            <p className="text-lg font-semibold text-white">
              Teaching every child at their level
            </p>
          </li>
          <li className="flex items-center gap-4">
            <Globe className="h-5 w-5 shrink-0 text-accent-yellow" />
            <p className="text-lg font-semibold text-white">
              Built to scale with government
            </p>
          </li>
        </ul>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-start animate-fadeIn">
          <Button
            asChild
            size="lg"
            className="bg-accent-yellow text-gray-900 hover:bg-yellow-400 font-bold text-base px-8"
          >
            <Link href="/methodology">
              Learn About Methodology
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white hover:text-primary text-base px-8"
          >
            <Link href="/impact">View Impact</Link>
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2" />
        </div>
      </div>
    </section>
  );
}
