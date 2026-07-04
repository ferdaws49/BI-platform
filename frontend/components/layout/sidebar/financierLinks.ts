import {
  LayoutDashboard,
  DollarSign,
  Wallet,
  User,
  FileText,
  BellIcon,
  Settings,
  LogOut,
  BarChart3,
} from "lucide-react";

export const financierLinks = [
  {
    icon: LayoutDashboard,
    label: "Tableau de bord",
    href: "/financier/dashboard",
  },
  {
    icon: DollarSign,
    label: "Revenue",
    href: "/financier/revenue",
  },
  {
    icon: Wallet,
    label: "Cout",
    href: "/financier/cout",
  },
  {
    icon: BarChart3,
    label: "Analyse prédictive",
    href: "/financier/predictive",
  },
  {
    icon: FileText,
    label: "Report & Export",
    href: "/financier/report-export",
  },
  {
    icon: BellIcon,
    label: "Alerts",
    href: "/financier/alerts",
  },
  {
    icon: User,
    label: "Profile",
    href: "/financier/profile",
  },
  {
    icon: LogOut,
    label: "Déconnexion",
    href: "/auth/login",
  },
];

