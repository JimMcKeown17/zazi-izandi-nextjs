import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MissionSection from "@/components/about/mission-section";
import ProgramTimeline from "@/components/about/program-timeline";
import { BookOpen, Heart, Users } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary-700 to-primary-900 text-white py-24 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}></div>
          </div>
          
          <div className="container relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fadeIn">
                About Zazi iZandi
              </h1>
              <p className="text-xl md:text-2xl mb-2 text-white/90">
                Transforming early literacy and creating opportunities.
              </p>
              <p className="text-xl md:text-2xl mb-8 text-white/90">
                One classroom, one school at a time.
              </p>
              
              {/* Core Values */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <BookOpen className="h-10 w-10 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Data-Driven</h3>
                  <p className="text-sm text-white/80">
                    Evidence-based interventions with continuous measurement and improvement
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <Users className="h-10 w-10 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Community-Centered</h3>
                  <p className="text-sm text-white/80">
                    Recruiting and training youth from the communities we serve
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <Heart className="h-10 w-10 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Impact-Focused</h3>
                  <p className="text-sm text-white/80">
                    Addressing literacy and unemployment in one go
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Crisis Section */}
        <MissionSection />

        {/* Timeline Section */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-8 h-1 bg-accent-yellow" />
                <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                  Our Journey
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                3 Years of Growth
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                From pilot launch to nationwide scale—see how we've evolved, tested, and
                improved our approach to early literacy intervention.
              </p>
            </div>

            <ProgramTimeline />
          </div>
        </section>

        {/* Testing & Innovation Philosophy */}
        <section className="py-16 bg-primary text-white">
          <div className="container max-w-4xl text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-8 h-1 bg-accent-yellow" />
              <span className="text-sm font-semibold uppercase tracking-widest text-white/70">
                Our Approach
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Continuous Testing & Learning
            </h2>
            <p className="text-lg mb-6 text-white/90">
              Each year, we test something new as we iterate towards the best possible program. 
              We embrace variation in our results because it helps us understand what works, 
              where, and why.
            </p>
            <p className="text-base text-white/80">
              We expect different outcomes from different cohorts—full-time youth versus 
              part-time, government TAs with varying time allocations—and we use this 
              data to continuously refine our approach.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}