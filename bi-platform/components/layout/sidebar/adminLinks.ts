import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Upload,
  Settings,
  LogOut,
} from "lucide-react";

const adminLinks = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/admin/dashboard",
  },
  {
    icon: Users,
    label: "Utilisateurs",
    href: "/admin/users",
  },
  {
    icon: GraduationCap,
    label: "Apprenants",
    href: "/admin/learners",
  },
  {
    icon: BookOpen,
    label: "Ressources",
    href: "/admin/resources",
  },
  {
    icon: Upload,
    label: "Import Données",
    href: "/admin/import",
  },
  {
    icon: Settings,
    label: "Paramètres",
    href: "/admin/settings",
  },
  {
    icon: LogOut,
    label: "Logout",
    href: "/admin/logout",
  },
];

export { adminLinks };