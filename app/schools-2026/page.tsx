import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import StatsSummary2026 from "@/components/schools-2026/stats-summary-2026";
import SchoolCardsGrid2026 from "@/components/schools-2026/school-cards-grid-2026";
import { type School2026Data } from "@/components/schools-2026/school-card-2026";
import { CalendarDays, MapPin } from "lucide-react";

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
  const data = await getSchools2026Data();

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-green-600 to-emerald-800 text-white py-16">
          <div className="container text-center">
            <CalendarDays className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              2026 Schools
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-white/90">
              Live session data and dosage tracking across all Zazi iZandi
              schools
            </p>
          </div>
        </section>

        {data ? (
          <>
            {/* Stats Summary */}
            <section className="py-12 bg-white">
              <div className="container">
                <StatsSummary2026
                  totalSchools={data.summary.total_schools}
                  totalEAs={data.summary.total_eas}
                  totalChildren={data.summary.total_children}
                  totalSessionsThisMonth={
                    data.summary.total_sessions_this_month
                  }
                />
              </div>
            </section>

            {/* School Cards Section */}
            <section className="py-12 bg-gray-50">
              <div className="container">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      School Dosage Overview
                    </h2>
                    <p className="text-gray-600">
                      Session frequency and flag tracking per school — colour
                      coded by average sessions per group per week
                    </p>
                  </div>
                </div>

                <SchoolCardsGrid2026 schools={data.schools} />
              </div>
            </section>
          </>
        ) : (
          /* Error / Loading State */
          <section className="py-20 bg-white">
            <div className="container text-center">
              <div className="max-w-md mx-auto">
                <CalendarDays className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Data Unavailable
                </h2>
                <p className="text-gray-600">
                  Unable to load 2026 school data. The data service may be
                  starting up — please try again in a few minutes.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-12 bg-gradient-to-br from-primary-50 to-blue-50">
          <div className="container text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Explore Detailed Analytics
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Visit our Data Portal for deeper analysis, flag details, and
              historical trends
            </p>
            <a
              href="https://dataportal.zaziizandi.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-800 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Open Data Portal
              <MapPin className="h-5 w-5" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
