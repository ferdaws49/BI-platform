"use client";

import { Bell } from "lucide-react";

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  adminRole?: string;
}

export default function AdminHeader({ title, subtitle, adminRole = "Super Admin" }: AdminHeaderProps) {
  return (
    <header className="bg-background border-b border-border shadow-sm px-6 py-4 flex items-center justify-between gap-3 transition-colors duration-300">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative cursor-pointer transition hover:scale-110">
          <Bell className="text-foreground" size={20} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
            3
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-800 dark:text-emerald-400 text-xs font-semibold">
            SA
          </div>
          <span className="text-sm text-foreground font-medium">Super Admin</span>
        </div>
      </div>
    </header>
  );
}