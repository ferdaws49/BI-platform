"use client";

import { BookOpen, User, Star, LayoutGrid } from "lucide-react";
import { Card, CardContent } from "./ui";

interface StatsStripProps {
  stats: {
    formationsCount: number;
    formateursCount: number;
    categoriesCount: number;
    avgRating: string | number;
  };
}

export function StatsStrip({ stats }: StatsStripProps) {
  const displayStats = [
    { title: "Formations", value: stats.formationsCount, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
    { title: "Formateurs", value: stats.formateursCount, icon: User, color: "text-[hsl(var(--admin-info))]", bg: "bg-[hsl(var(--admin-info))]/10" },
    { title: "Catégories", value: stats.categoriesCount, icon: LayoutGrid, color: "text-muted-foreground", bg: "bg-muted" },
    { title: "Note moyenne", value: stats.avgRating, icon: Star, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {displayStats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="border-none shadow-sm kpi-animate" style={{ animationDelay: `${i * 100}ms` }}>
            <CardContent className="flex items-center p-4 m-0 gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground leading-none mb-1">{stat.value}</div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
