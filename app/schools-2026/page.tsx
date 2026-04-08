import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import SchoolCardsGrid2026 from "@/components/schools-2026/school-cards-grid-2026";
import SchoolMap2026 from "@/components/schools-2026/school-map-2026";
import DosageMosaic from "@/components/schools-2026/dosage-mosaic";
import type { School2026Data } from "@/lib/schools-2026/school2026-data";
import { getGroups2026, getSessionsActivity } from "@/lib/pm/api";
import { enrichSchoolsWithGroups } from "@/lib/schools-2026/enrich";
import { AlertTriangle, MapPin } from "lucide-react";

interface Schools2026ApiResponse {
  generated_at: string;
  summary: {
    total_schools: number;
    total_eas: number;
    total_children: number;
    total_sessions_this_week: number;
    total_sessions_this_month: number;
  };
  schools: School2026Data[];
}

async function getSchools2026Data(): Promise<Schools2026ApiResponse | null> {
  const apiUrl = process.env.DJANGO_API_URL;
  if (!apiUrl) {
    console.error("DJANGO_API_URL is not set");
    return null;
  }

  try {
    const res = await fetch(`${apiUrl}/api/schools-2026/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`Django API returned ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch schools 2026 data:", error);
    return null;
  }
}

export default async function Schools2026Page() {
  const [schoolsData, groupsResult, sessionsResult] = await Promise.all([
    getSchools2026Data(),
    getGroups2026(),
    getSessionsActivity(30, "all"),
  ]);

  const enrichedSchools = schoolsData
    ? enrichSchoolsWithGroups(
        schoolsData.schools,
        groupsResult.isLive ? groupsResult.data.groups : [],
        sessionsResult.isLive ? sessionsResult.data.ea_heatmap.eas : []
      )
    : null;

  const groupsAvailable = groupsResult.isLive;
  const summary = schoolsData?.summary;

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Minimal Hero */}
        <section className="bg-white pt-6 pb-2">
          <div className="container">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              2026 Schools
            </h1>
            <p className="text-base text-gray-500 mb-4">
              Live session data, dosage tracking, and quality monitoring
            </p>

            {/* Inline stats */}
            {summary && (
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
                <span>
                  <span className="text-2xl font-bold text-gray-900">
                    {summary.total_schools}
                  </span>{" "}
                  <span className="text-gray-500">Schools</span>
                </span>
                <span className="text-gray-300 hidden sm:inline">·</span>
                <span>
                  <span className="text-2xl font-bold text-gray-900">
                    {summary.total_eas}
                  </span>{" "}
                  <span className="text-gray-500">EAs</span>
                </span>
                <span className="text-gray-300 hidden sm:inline">·</span>
                <span>
                  <span className="text-2xl font-bold text-gray-900">
                    {summary.total_children.toLocaleString()}
                  </span>{" "}
                  <span className="text-gray-500">Children</span>
                </span>
                <span className="text-gray-300 hidden sm:inline">·</span>
                <span>
                  <span className="text-2xl font-bold text-gray-900">
                    {summary.total_sessions_this_month.toLocaleString()}
                  </span>{" "}
                  <span className="text-gray-500">Sessions this month</span>
                </span>
              </div>
            )}
          </div>
        </section>

        {schoolsData && enrichedSchools ? (
          <>
            {/* Degradation banner */}
            {!groupsAvailable && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
                <div className="container flex items-center gap-2 text-amber-800 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Detailed EA data unavailable — showing summary view
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Map */}
            <section className="pb-8 bg-white">
              <div className="container">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  School Locations
                </h2>
                <SchoolMap2026 schools={enrichedSchools} />

                {/* Dosage mosaic — visual summary of all schools */}
                <div className="mt-5">
                  <DosageMosaic schools={enrichedSchools} />
                </div>
              </div>
            </section>

            {/* School Cards Section */}
            <section className="py-10 bg-gray-50">
              <div className="container">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    School Dosage Overview
                  </h2>
                  <p className="text-sm text-gray-500">
                    Session frequency, quality flags, and EA performance —
                    colour coded by dosage level
                  </p>
                </div>

                <SchoolCardsGrid2026
                  schools={enrichedSchools}
                  groupsAvailable={groupsAvailable}
                />
              </div>
            </section>
          </>
        ) : (
          <section className="py-20 bg-white">
            <div className="container text-center">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Data Unavailable
                </h2>
                <p className="text-gray-500">
                  Unable to load 2026 school data. The data service may be
                  starting up — please try again in a few minutes.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-10 bg-white border-t border-gray-100">
          <div className="container text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Explore Detailed Analytics
            </h2>
            <p className="text-gray-500 mb-5 max-w-xl mx-auto">
              Visit our Data Portal for deeper analysis, flag details, and
              historical trends
            </p>
            <a
              href="https://dataportal.zaziizandi.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-800 text-white font-semibold px-7 py-2.5 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              Open Data Portal
              <MapPin className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
