import { School, Users, Baby, CalendarDays } from "lucide-react";

interface StatsSummaryProps {
  totalSchools: number;
  totalEAs: number;
  totalChildren: number;
  totalSessionsThisMonth: number;
}

export default function StatsSummary2026({
  totalSchools,
  totalEAs,
  totalChildren,
  totalSessionsThisMonth,
}: StatsSummaryProps) {
  const stats = [
    {
      label: "Schools",
      value: totalSchools,
      icon: School,
      gradient: "from-green-50 to-emerald-50",
      border: "border-green-500",
      text: "text-green-700",
      iconColor: "text-green-600",
    },
    {
      label: "Education Assistants",
      value: totalEAs,
      icon: Users,
      gradient: "from-primary-50 to-blue-50",
      border: "border-primary",
      text: "text-primary",
      iconColor: "text-primary",
    },
    {
      label: "Children",
      value: totalChildren.toLocaleString(),
      icon: Baby,
      gradient: "from-purple-50 to-violet-50",
      border: "border-purple-500",
      text: "text-purple-700",
      iconColor: "text-purple-600",
    },
    {
      label: "Sessions This Month",
      value: totalSessionsThisMonth.toLocaleString(),
      icon: CalendarDays,
      gradient: "from-orange-50 to-amber-50",
      border: "border-orange-500",
      text: "text-orange-700",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`bg-gradient-to-br ${stat.gradient} rounded-lg p-6 border-l-4 ${stat.border}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
          <div className={`text-3xl font-bold ${stat.text}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
