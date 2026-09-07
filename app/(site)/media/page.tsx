import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import VideoSection from "@/components/media/video-section";
import AllVideosSection from "@/components/media/all-videos-section";
import NewsSection from "@/components/media/news-section";
import TestimonialsSection from "@/components/media/testimonials-section";
import GallerySection from "@/components/media/gallery-section";

export const metadata = {
  title: "Media & Stories | Zazi iZandi",
  description:
    "Videos, news coverage, success stories, and photos from the Zazi iZandi early literacy program in the Eastern Cape.",
};

export default function MediaPage() {
  return (
    <>
      <Header />
      <main className="pt-20 overflow-x-hidden">
        <VideoSection />
        <NewsSection />
        <AllVideosSection />
        <TestimonialsSection />
        <GallerySection />
      </main>
      <Footer />
    </>
  );
}
