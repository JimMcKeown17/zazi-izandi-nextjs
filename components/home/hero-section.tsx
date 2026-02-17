import Link from "next/link";
import { ArrowRight, Pencil, Target, Globe } from "lucide-react";
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

        {/* Feature bullets — matching Django screenshot layout */}
        <ul className="space-y-6 mb-12 max-w-xl animate-fadeIn">
          <li className="flex items-start gap-4">
            <Pencil className="h-6 w-6 mt-0.5 shrink-0 text-accent-yellow" />
            <p className="text-base md:text-lg text-white/90">
              Working with existing Teacher Assistants in classrooms. Zazi iZandi
              TAs are more effective and efficient than a typical TA.
            </p>
          </li>
          <li className="flex items-start gap-4">
            <Target className="h-6 w-6 mt-0.5 shrink-0 text-accent-yellow" />
            <p className="text-base md:text-lg text-white/90">
              Working with children at THEIR level providing targeted support to
              ensure no child is left behind.
            </p>
          </li>
          <li className="flex items-start gap-4">
            <Globe className="h-6 w-6 mt-0.5 shrink-0 text-accent-yellow" />
            <p className="text-base md:text-lg text-white/90">
              Built to scale. Zazi iZandi is open-source, easy to implement, and
              designed for scale.
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
            <Link href="/about">
              Learn About Our Program
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white hover:text-primary text-base px-8"
          >
            <Link href="/impact">View Our Impact</Link>
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
