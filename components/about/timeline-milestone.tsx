"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface TimelineMilestoneProps {
  year: string;
  title: string;
  period: string;
  description: string;
  stats: {
    label: string;
    value: string;
  }[];
  highlights?: string[];
  icon: LucideIcon;
  color: string;
  side?: "left" | "right";
}

export default function TimelineMilestone({
  year,
  title,
  period,
  description,
  stats,
  highlights,
  icon: Icon,
  color,
  side = "right",
}: TimelineMilestoneProps) {
  return (
    <div className={`flex items-center gap-8 mb-16 ${side === "left" ? "flex-row-reverse" : ""}`}>
      {/* Content Card */}
      <div className="flex-1">
        <div className={`bg-white rounded-2xl shadow-xl p-8 border-t-4 ${color} hover:shadow-2xl transition-shadow duration-300`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className={`text-sm font-bold ${color.replace('border-', 'text-')} mb-1`}>
                {period}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
            </div>
            <div className={`${color.replace('border-', 'bg-').replace('600', '100')} p-3 rounded-lg`}>
              <Icon className={`h-6 w-6 ${color.replace('border-', 'text-')}`} />
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-6">{description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold ${color.replace('border-', 'text-')}`}>
                  {stat.value}
                </div>
                <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Highlights */}
          {highlights && highlights.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Key Highlights:</h4>
              <ul className="space-y-1">
                {highlights.map((highlight, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className={`${color.replace('border-', 'text-')} mr-2`}>•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Dot */}
      <div className="relative flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full ${color.replace('border-', 'bg-')} flex items-center justify-center shadow-lg z-10`}>
          <span className="text-white font-bold text-lg">{year}</span>
        </div>
      </div>

      {/* Spacer for other side */}
      <div className="flex-1 hidden lg:block"></div>
    </div>
  );
}