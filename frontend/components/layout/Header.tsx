"use client";

import { Bell } from "lucide-react";
import AdvancedFilters from "@/components/ui/FiltreAvancee";
import { useFilters } from "@/context/FilterContext";

interface HeaderProps {
  title: string;
  subtitle: string;
  showFilters?: boolean;
}

export default function Header({
  title,
  subtitle,
  showFilters = false,
}: HeaderProps) {
  const { filters, setFilters, resetFilters } = useFilters();

  return (
    <header className="px-6 py-4 flex items-center justify-between flex-wrap gap-3 shadow-sm border-b border-border bg-background transition-colors duration-300">
      {/* Title */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        {showFilters && (
          <AdvancedFilters
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
          />
        )}

        <div className="relative cursor-pointer transition hover:scale-110">
          <Bell className="text-foreground" size={20} />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs px-1 rounded-full">
            3
          </span>
        </div>
      </div>
    </header>
  );
}
