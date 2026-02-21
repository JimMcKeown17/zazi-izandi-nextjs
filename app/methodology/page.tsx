import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MethodologyHero from "@/components/methodology/hero-section";
import ProgrammeOverview from "@/components/methodology/programme-overview";
import DoEPartnershipSection from "@/components/methodology/doe-partnership-section";
import TaRLSection from "@/components/methodology/tarl-section";
import EATrainingSection from "@/components/methodology/ea-training-section";
import EGRASection from "@/components/methodology/egra-section";
import GamesVideosCta from "@/components/methodology/games-videos-cta";
import MethodologyCTA from "@/components/methodology/methodology-cta";

export const metadata = {
  title: "Our Methodology | Zazi iZandi",
  description:
    "How Zazi iZandi teaches early literacy: structured sound instruction, Teaching at the Right Level (TaRL), trained Education Assistants, and a data-driven approach.",
};

export default function MethodologyPage() {
  return (
    <>
      <Header />
      <main className="pt-20 overflow-x-hidden">
        <MethodologyHero />
        <ProgrammeOverview />
        <DoEPartnershipSection />
        <TaRLSection />
        <EATrainingSection />
        <EGRASection />
        <GamesVideosCta />
        <MethodologyCTA />
      </main>
      <Footer />
    </>
  );
}
