import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { FileText, Gamepad2, Database, Download, BookOpen } from "lucide-react";

export const metadata = {
  title: "Open Source Resources | Zazi iZandi",
  description:
    "Download free training guides, literacy activities, and anonymized assessment datasets from the Zazi iZandi early literacy programme.",
};

const guides = [
  {
    title: "Teaching Assistant Guide — English",
    description:
      "Comprehensive guide for teaching assistants delivering the Zazi iZandi programme in English. Covers letter-sound instruction, daily routines, and assessment procedures.",
    href: "/open-source/guides/Zazi Zandi Teaching Assistant Guide 1.0_June2025_English.pdf",
    language: "English",
  },
  {
    title: "Teaching Assistant Guide — isiXhosa",
    description:
      "The full teaching assistant guide translated into isiXhosa for mother-tongue delivery of the programme.",
    href: "/open-source/guides/Zazi Zandi Teaching Assistant Guide 1.0_June2025_isiXhosa.pdf",
    language: "isiXhosa",
  },
  {
    title: "Teaching Assistant Guide — Afrikaans",
    description:
      "The full teaching assistant guide translated into Afrikaans for delivery in Afrikaans-medium classrooms.",
    href: "/open-source/guides/Zazi Zandi Teaching Assistant Guide 1.0_June2025_Afrikaans.pdf",
    language: "Afrikaans",
  },
  {
    title: "Data Collection Guide — isiXhosa",
    description:
      "Step-by-step instructions for conducting EGRA-style letter-sound assessments in isiXhosa, including scoring and data recording procedures.",
    href: "/open-source/guides/Zazi iZandi - isiXhosa - Data Collection.pdf",
    language: "isiXhosa",
  },
];

const activities = [
  {
    title: "Alphabet Cards — isiXhosa (Lowercase)",
    description:
      "Printable letter cards for isiXhosa alphabet instruction. Designed for use in daily letter-sound drills with small groups.",
    href: "/open-source/activities/Zazi iZandi - Alphabet Cards - isiXhosa - Lowercase (TeachersPet).pdf",
  },
  {
    title: "Syllable Cards (Lowercase)",
    description:
      "Printable syllable cards for blending practice. Helps children move from individual letter sounds to reading syllables.",
    href: "/open-source/activities/Zazi iZandi - Syllable Cards - Lowercase (TeachersPet).pdf",
  },
  {
    title: "EGRA Grid A — English & isiXhosa",
    description:
      "Letter-sound assessment grid used for baseline and endline testing. Contains randomized letter arrangements for both English and isiXhosa.",
    href: "/open-source/activities/Zazi iZandi_EGRA Grid A_English and isiXhosa_Updated for b.pdf",
  },
  {
    title: "EGRA Grid A — Afrikaans",
    description:
      "Letter-sound assessment grid adapted for Afrikaans, following the same EGRA methodology.",
    href: "/open-source/activities/Zazi iZandi EGRA Grid A - Afrikaans.pdf",
  },
  {
    title: "Blending & Word Reading Grids — isiXhosa",
    description:
      "Practice grids for blending letter sounds into syllables and reading simple isiXhosa words.",
    href: "/open-source/activities/Blending and word reading Grids_isiXhosa.pdf",
  },
  {
    title: "Snakes & Ladders — Literacy Game",
    description:
      "A printable board game that reinforces letter-sound knowledge through play. Children practise letter recognition as they move around the board.",
    href: "/open-source/activities/Latest Version Snakes and Ladders (1).pdf",
  },
];

const datasets = [
  {
    title: "2023 Assessment Results (Anonymized)",
    description:
      "Anonymized learner-level assessment data from the 2023 programme year. Includes baseline and endline letter-sound scores across participating schools.",
    href: "/open-source/datasets/2023 Results - Simple (Anonymized).csv",
    format: "CSV",
  },
  {
    title: "2024 Assessment Results (Anonymized)",
    description:
      "Anonymized learner-level assessment data from the 2024 programme year. Includes baseline, midline, and endline scores with expanded metrics.",
    href: "/open-source/datasets/2024 Results - Simple (Anonymized).xlsx",
    format: "XLSX",
  },
];

function ResourceCard({
  title,
  description,
  href,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  badge?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-4 p-5 rounded-xl border border-gray-200 bg-white hover:border-primary/30 hover:shadow-md transition-all"
    >
      <div className="shrink-0 mt-1 w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
            {title}
          </h4>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-yellow text-gray-900">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </a>
  );
}

export default function ResourcesPage() {
  return (
    <>
      <Header />
      <main className="pt-20 overflow-x-hidden">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary to-primary-800 text-white py-20">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Open Source Resources
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-white/90">
              Everything we create is freely available. Download our training
              guides, classroom activities, and assessment data to support early
              literacy in your community.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{guides.length} Guides</span>
              </div>
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                <span>{activities.length} Activities</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>{datasets.length} Datasets</span>
              </div>
            </div>
          </div>
        </section>

        {/* Guides Section */}
        <section className="py-16 bg-gray-50">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Guides & Manuals
              </h2>
            </div>
            <p className="text-gray-600 mb-8 ml-[52px]">
              Training materials for teaching assistants and data collectors,
              available in English, isiXhosa, and Afrikaans.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guides.map((guide) => (
                <ResourceCard
                  key={guide.href}
                  title={guide.title}
                  description={guide.description}
                  href={guide.href}
                  badge={guide.language}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Activities Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Gamepad2 className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Games & Activities
              </h2>
            </div>
            <p className="text-gray-600 mb-8 ml-[52px]">
              Printable letter cards, assessment grids, and literacy games ready
              for the classroom.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activities.map((activity) => (
                <ResourceCard
                  key={activity.href}
                  title={activity.title}
                  description={activity.description}
                  href={activity.href}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Datasets Section */}
        <section className="py-16 bg-gray-50">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Data Sets
              </h2>
            </div>
            <p className="text-gray-600 mb-8 ml-[52px]">
              Anonymized assessment data for researchers, policymakers, and
              anyone interested in evidence-based literacy interventions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {datasets.map((dataset) => (
                <ResourceCard
                  key={dataset.href}
                  title={dataset.title}
                  description={dataset.description}
                  href={dataset.href}
                  badge={dataset.format}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
