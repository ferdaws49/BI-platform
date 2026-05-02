// components/sidebar/responsbale pédagoLinks.ts
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  Settings,
  LogOut,
} from "lucide-react";

const respedLinks = [
  {
    icon: LayoutDashboard,
    label: "Tableau de bord",
    href: "/respedagogique/dashboard",
  },
  {
    icon: GraduationCap,
    label: "Formations",
    href: "/respedagogique/formations",
  },
  { icon: UserCheck, label: "Formateurs", href: "/respedagogique/formateurs" },
  { icon: Users, label: "Apprenants", href: "/respedagogique/apprenants" },
  { icon: Calendar, label: "Planning", href: "/respedagogique/planning" },
  { icon: Settings, label: "Paramètres", href: "/respedagogique/settings" },
  { label: "Déconnexion", href: "/respedagogique/logout", icon: LogOut },
];

export { respedLinks };
