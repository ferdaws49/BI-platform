import {
  LayoutDashboard,
  DollarSign,
  Wallet,
  User,
  FileText,
  BellIcon,
  Settings,
  LogOut,
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
    icon: User,
    label: "Analytics",
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
    href: "/apprenant/profile",
  },
  {
    icon: Settings,
    label: "Paramètres",
    href: "#",
  },
  {
    icon: LogOut,
    label: "Déconnexion",
    href: "/auth/login",
  },
];

