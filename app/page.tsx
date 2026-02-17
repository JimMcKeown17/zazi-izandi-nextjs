import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/home/hero-section";
import PartnersSection from "@/components/home/partners-section";
import StatsSection from "@/components/home/stats-section";
import VideoSection from "@/components/home/video-section";
import ResearchSection from "@/components/home/research-section";
import OverviewSection from "@/components/home/overview-section";
import CTASection from "@/components/home/cta-section";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <ResearchSection />
        <VideoSection />
        <OverviewSection />
        <CTASection />
        <PartnersSection />
      </main>
      <Footer />
    </>
  );
}
