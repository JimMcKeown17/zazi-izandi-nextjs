import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { CoachHero } from "@/components/app-marketing/coach-hero-section";
import { RoadFigures } from "@/components/app-marketing/road-figures";
import { ModelsTable } from "@/components/app-marketing/models-table";
import { PlatformSection } from "@/components/app-marketing/platform-section";
import "@/components/app-marketing/marketing.css";

/* This page keeps its own display pairing (Fraunces + Nunito Sans) rather than
   the site's Roboto/Open Sans. It is a deliberate editorial voice for the app
   story; the fonts are loaded here only and scoped by the .zzm wrapper. */
const fraunces = Fraunces({ subsets: ["latin"], weight: ["600", "900"], variable: "--zzm-disp", display: "swap" });
const nunito = Nunito_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--zzm-body", display: "swap" });

export const metadata: Metadata = {
  title: "The Zazi iZandi App | Zazi iZandi",
  description:
    "A coach in every EA’s pocket. How the Zazi iZandi app closes the loop between the classroom and Masi’s AI, and what that changes for programme quality, training and management.",
};

export default function MobileAppPage() {
  return (
    <>
      <Header />
      <main className="pt-20 overflow-x-hidden">
        <div className={`zzm ${fraunces.variable} ${nunito.variable}`}>
          <CoachHero />
          <section>
            <div className="wrap">
              <p className="eyebrow">Why the app changes the game</p>
              <h2>One-way traffic, or a two-way loop</h2>
              <p className="lede">
                A survey app sends data up to a server. The Zazi iZandi app sends it up,
                thinks about it, and brings help back down to the same classroom.
              </p>
              <RoadFigures />
            </div>
          </section>
          <ModelsTable />
          <PlatformSection />
          <div className="credit">
            <div className="wrap">
              Built by AI5 Labs · inquire with <a href="mailto:jim@masinyusane.org">jim@masinyusane.org</a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
