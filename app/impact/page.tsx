import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ImpactHeroSection from "@/components/impact/hero-section";
import KpiSection from "@/components/impact/kpi-section";
import BenchmarkSection from "@/components/impact/benchmark-section";
import BeforeAfterSection from "@/components/impact/before-after-section";
import ChartsSection from "@/components/impact/charts-section";
import SuccessStoriesSection from "@/components/impact/success-stories-section";

export const metadata = {
  title: "Our Impact | Zazi iZandi",
  description:
    "Data-driven evidence of how Zazi iZandi is transforming early literacy outcomes in the Eastern Cape, with key metrics, charts, and success stories.",
};

export default function ImpactPage() {
  return (
    <>
      <Header />
      <main className="pt-20 overflow-x-hidden">
        <ImpactHeroSection />
        <KpiSection />
        <BenchmarkSection />
        <BeforeAfterSection />
        <ChartsSection />
        <SuccessStoriesSection />
      </main>
      <Footer />
    </>
  );
}
