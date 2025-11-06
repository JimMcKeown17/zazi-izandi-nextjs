import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/home/hero-section";
import StatsSection from "@/components/home/stats-section";
import OverviewSection from "@/components/home/overview-section";
import CTASection from "@/components/home/cta-section";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <OverviewSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}