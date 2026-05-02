// components/sidebar/directeurLinks.ts
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Star,
  Bell,
  Download,
  Settings,
  LogOut,
} from "lucide-react";

export const directeurLinks = [
  { label: "Dashboard", href: "/directeur/dashboard", icon: LayoutDashboard },
  {
    label: "Rapports Stratégiques",
    href: "/directeur/reports",
    icon: FileText,
  },
  { label: "Analyse Financière", href: "/directeur/finance", icon: DollarSign },
  { label: "Qualité", href: "/directeur/quality", icon: Star },
  { label: "Alertes", href: "/directeur/alerts", icon: Bell },
  { label: "Export", href: "/directeur/export", icon: Download },
  { label: "Paramètres", href: "/directeur/settings", icon: Settings },
  { label: "Logout", href: "/directeur/logout", icon: LogOut },
];
