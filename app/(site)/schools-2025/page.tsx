import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export const metadata = {
  title: "2025 Schools | Zazi iZandi",
};

export default function Schools2025Page() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <section className="container py-24 text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">2025 Schools</h1>
          <p className="text-xl text-gray-600 max-w-lg mx-auto">
            Data for the 2025 cohort is coming soon. Check back shortly.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
