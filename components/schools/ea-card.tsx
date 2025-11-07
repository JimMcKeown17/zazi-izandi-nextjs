"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Target,
  Calendar,
  Languages,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

interface EAData {
  "School Name": string;
  "Grade": string;
  "EGRA Baseline (Median)": number;
  "EGRA Endline (Median)": number;
  "Improvement": number;
  "Total Sessions (Median)": number;
  "Moving Too Fast (Count)": number;
  "Same Letter Groups (Count)": number;
  "EA Names": string;
  "Most Common Cohort": string;
  "Languages": string;
  "Total Assessments": number;
}

interface EACardProps {
  data: EAData;
}

export default function EACard({ data }: EACardProps) {
  // Performance color based on Improvement (Gain)
  const getPerformanceColor = (improvement: number) => {
    if (improvement >= 10) return {
      bg: "bg-gradient-to-br from-green-50 to-emerald-50",
      border: "border-green-500",
      badge: "bg-green-500",
      text: "text-green-700",
      label: "High Impact"
    };
    if (improvement >= 5) return {
      bg: "bg-gradient-to-br from-yellow-50 to-amber-50",
      border: "border-yellow-500",
      badge: "bg-yellow-500",
      text: "text-yellow-700",
      label: "Good Progress"
    };
    return {
      bg: "bg-gradient-to-br from-red-50 to-rose-50",
      border: "border-red-500",
      badge: "bg-red-500",
      text: "text-red-700",
      label: "Low Gain"
    };
  };

  const performance = getPerformanceColor(data.Improvement);
  const improvementPercent = ((data.Improvement / data["EGRA Baseline (Median)"]) * 100).toFixed(0);

  return (
    <Card className={`${performance.bg} ${performance.border} border-l-4 hover:shadow-xl transition-all duration-300 overflow-hidden group`}>
      <CardHeader className="pb-3">
        {/* Header with School Name and Performance Badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {data["School Name"]}
            </h3>
            <Badge variant="outline" className="text-xs font-medium">
              {data.Grade}
            </Badge>
          </div>
          <div className={`${performance.badge} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm`}>
            {performance.label}
          </div>
        </div>

        {/* EA Names */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
          <Users className="h-4 w-4" />
          <span className="font-medium">{data["EA Names"]}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Baseline */}
          <div className="bg-white/70 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Baseline</div>
            <div className="text-2xl font-bold text-gray-900">
              {data["EGRA Baseline (Median)"]}
            </div>
          </div>

          {/* Endline */}
          <div className="bg-white/70 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Endline</div>
            <div className="text-2xl font-bold text-primary">
              {data["EGRA Endline (Median)"]}
            </div>
          </div>

          {/* Improvement */}
          <div className={`bg-white/70 rounded-lg p-3 text-center ${performance.border} border-l-2`}>
            <div className="text-xs text-gray-500 mb-1">Gain</div>
            <div className={`text-2xl font-bold ${performance.text} flex items-center justify-center gap-1`}>
              <TrendingUp className="h-4 w-4" />
              +{data.Improvement}
            </div>
            <div className="text-xs font-semibold text-gray-600">
              ({improvementPercent}%)
            </div>
          </div>
        </div>

        {/* Sessions and Assessments */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/50 rounded-lg p-3 flex items-center gap-2">
            <Calendar className={`h-5 w-5 ${performance.text}`} />
            <div>
              <div className="text-xs text-gray-500">Sessions</div>
              <div className="text-lg font-bold text-gray-900">
                {data["Total Sessions (Median)"]}
              </div>
            </div>
          </div>

          <div className="bg-white/50 rounded-lg p-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs text-gray-500">Assessments</div>
              <div className="text-lg font-bold text-gray-900">
                {data["Total Assessments"]}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="space-y-2 pt-2 border-t border-gray-200">
          {/* Cohort */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Cohort Size
            </span>
            <span className="font-semibold text-gray-900">
              {data["Most Common Cohort"]}
            </span>
          </div>

          {/* Languages */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Languages
            </span>
            <span className="font-semibold text-gray-900">
              {data.Languages}
            </span>
          </div>

          {/* Flags */}
          {(data["Moving Too Fast (Count)"] > 0 || data["Same Letter Groups (Count)"] > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-200">
              {data["Moving Too Fast (Count)"] > 0 && (
                <Badge variant="outline" className="text-xs gap-1 bg-red-50 border-red-400 text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  Moving Fast: {data["Moving Too Fast (Count)"]}
                </Badge>
              )}
              {data["Same Letter Groups (Count)"] > 0 && (
                <Badge variant="outline" className="text-xs gap-1 bg-orange-50 border-orange-400 text-orange-700">
                  <AlertTriangle className="h-3 w-3" />
                  Same Groups: {data["Same Letter Groups (Count)"]}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}