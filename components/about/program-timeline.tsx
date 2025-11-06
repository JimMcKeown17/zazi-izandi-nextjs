"use client";

import TimelineMilestone from "./timeline-milestone";
import { Lightbulb, TrendingUp, Rocket, Users } from "lucide-react";

export default function ProgramTimeline() {
  return (
    <div className="relative max-w-7xl mx-auto px-4">
      {/* Vertical Timeline Line */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-blue-600 via-green-600 to-purple-600 h-full hidden lg:block"></div>

      {/* Timeline Milestones */}
      <div className="space-y-0">
        {/* 2023: Pilot Launch */}
        <TimelineMilestone
          year="2023"
          title="ZZ 1.0 - Letter Sounds"
          period="August - November 2023"
          description="Initial pilot testing the letter sounds curriculum and delivery model. Launched in partnership with Binding Constraints Labs and Masinyusane."
          stats={[
            { label: "Schools", value: "12" },
            { label: "Youth TAs", value: "52" },
            { label: "Children", value: "1,897" },
          ]}
          highlights={[
            "First deployment of letter sounds curriculum",
            "Testing delivery model with unemployed youth",
            "Partnership with Wordworks and Funda Wande",
          ]}
          icon={Lightbulb}
          color="border-blue-600"
          side="right"
        />

        {/* 2024: Expansion */}
        <TimelineMilestone
          year="2024"
          title="Expansion & Innovation"
          period="February - October 2024"
          description="Major expansion with improved curriculum and introduction of ZZ 2.0 for blending and word reading. Two cohorts launched throughout the year."
          stats={[
            { label: "Schools", value: "22" },
            { label: "Youth TAs", value: "110" },
            { label: "Children", value: "4,624" },
          ]}
          highlights={[
            "Cohort 1: 16 schools, 82 youth, 3,490 children (Feb-Oct)",
            "Cohort 2: 6 schools, 28 youth, 1,134 children (mid-year)",
            "Introduced ZZ 2.0: blending & word reading",
            "First ECD center pilot launched",
            "Applied lessons learned from 2023",
          ]}
          icon={TrendingUp}
          color="border-green-600"
          side="left"
        />

        {/* 2025: Scale */}
        <TimelineMilestone
          year="2025"
          title="Scale & Diversification"
          period="February 2025 - Present"
          description="Massive scale-up testing multiple delivery models: part-time youth, government TAs, full-time models, and year-long ECD programs across three languages."
          stats={[
            { label: "Schools/Centers", value: "568+" },
            { label: "TAs Trained", value: "600+" },
            { label: "Children Reached", value: "20,000+" },
          ]}
          highlights={[
            "SEF Youth: 42 schools, 73 part-time TAs (4 days/week)",
            "Government TAs - NMB: 460 trained (Aug-Oct intervention)",
            "Government TAs - East London: 50 schools, 1-month foundation",
            "ECD Year-Long: 16 centers, 353 children",
            "Testing 3 languages: English, isiXhosa, Afrikaans",
            "New tech: SurveyCTO & TeamPact data tools",
            "Full-time vs part-time model comparisons",
            "Major partnership with Department of Education",
          ]}
          icon={Rocket}
          color="border-purple-600"
          side="right"
        />
      </div>

      {/* Future Vision */}
      <div className="mt-20 text-center">
        <div className="inline-block bg-gradient-to-r from-primary to-purple-600 text-white rounded-full px-8 py-4 shadow-lg">
          <Users className="inline-block h-6 w-6 mr-2" />
          <span className="font-bold text-lg">Continuous Innovation & Growth</span>
        </div>
        <p className="mt-6 text-gray-600 max-w-2xl mx-auto">
          We continue to test, learn, and iterate towards the most effective and scalable
          literacy intervention model for South Africa's children.
        </p>
      </div>
    </div>
  );
}