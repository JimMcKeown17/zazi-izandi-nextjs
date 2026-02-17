"use client";

import Image from "next/image";
import { LucideIcon } from "lucide-react";

type ColorKey = "blue" | "green" | "purple";

const colorMap: Record<ColorKey, { border: string; bg: string; text: string; iconBg: string }> = {
  blue: {
    border: "border-blue-600",
    bg: "bg-blue-600",
    text: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  green: {
    border: "border-green-600",
    bg: "bg-green-600",
    text: "text-green-600",
    iconBg: "bg-green-100",
  },
  purple: {
    border: "border-purple-600",
    bg: "bg-purple-600",
    text: "text-purple-600",
    iconBg: "bg-purple-100",
  },
};

interface TimelineMilestoneProps {
  year: string;
  title: string;
  period: string;
  description: string;
  stats: { label: string; value: string }[];
  highlights?: string[];
  icon: LucideIcon;
  color: ColorKey;
  side?: "left" | "right";
  image?: string;
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
  image,
}: TimelineMilestoneProps) {
  const c = colorMap[color];

  return (
    <div className={`flex flex-col lg:flex-row items-center gap-8 mb-16 ${side === "left" ? "lg:flex-row-reverse" : ""}`}>
      {/* Content Card */}
      <div className="flex-1 w-full lg:w-auto">
        <div className={`bg-white rounded-2xl shadow-xl p-8 border-t-4 ${c.border} hover:shadow-2xl transition-shadow duration-300`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className={`text-sm font-bold ${c.text} mb-1`}>{period}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
            </div>
            <div className={`${c.iconBg} p-3 rounded-lg`}>
              <Icon className={`h-6 w-6 ${c.text}`} />
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-6">{description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold ${c.text}`}>{stat.value}</div>
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
                    <span className={`${c.text} mr-2`}>•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Dot */}
      <div className="relative hidden lg:flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full ${c.bg} flex items-center justify-center shadow-lg z-10`}>
          <span className="text-white font-bold text-lg">{year}</span>
        </div>
      </div>

      {/* Photo for other side */}
      <div className="flex-1 hidden lg:flex items-center justify-center">
        {image && (
          <div className="w-full rounded-2xl overflow-hidden shadow-lg">
            <Image
              src={image}
              alt=""
              width={600}
              height={450}
              className="w-full h-72 object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
