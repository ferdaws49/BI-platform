"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Calendar,
  Settings,
  Search,
  ChevronDown,
  GraduationCap,
  BarChart2,
  FileText,
  DollarSign,
  LogOut,
  Menu,
  BellDot,
  BellIcon,
  Wallet,
  Receipt,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { getProfile } from "@/lib/profile.api";
import AlertDropdown from "@/app/financier/alerts/components/AlertDropdown";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  badge?: number;
}



const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/financier/dashboard" },
  { icon: DollarSign, label: "Revenue", href: "/financier/revenue"},
  { icon: Wallet, label: "Cout", href: "/financier/cout" },
  { icon: User, label: "Analytics", href: '/financier/predictive'},
  { icon:  FileText, label: "Report & Export", href: "/financier/report-export" },
  { icon: BellIcon, label: "Alerts", href: "/financier/alerts"},
  { icon: User, label: "Profile", href: '/apprenant/profile' },
];

const bottomItems: NavItem[] = [
  { icon: Settings, label: "Paramètres", href: "#" },
  { icon: LogOut, label: "Déconnexion", href: "/auth/login" },
];



export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();

  useEffect(() => {
      async function loadUser() {
        try {
          const data = await getProfile();
          setUser(data);
        } catch (error) {
          console.error("Erreur chargement ", error);
        } finally {
          setLoading(false);
        }
      }
      loadUser();
    }, []);

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f9f8f3", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarExpanded || mobileOpen ? "w-64 shadow-2xl" : "w-[72px]"}
          lg:relative lg:flex
          ${mobileOpen ? "flex" : "hidden lg:flex"}
        `}
        style={{ background: "#2d4a3e" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 min-h-[72px]">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#1a7149" }}
          >
            <GraduationCap size={22} className="text-white" />
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              sidebarExpanded || mobileOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
            }`}
          >
            <p className="text-white font-bold text-base leading-tight whitespace-nowrap font-sora">
              CentreForm BI
            </p>
            <p className="text-white/50 text-xs whitespace-nowrap">Plateforme de Pilotage</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-hidden">
          <div className="space-y-1 px-2">
            {navItems.map((item) => {
  const isActive = pathname.startsWith(item.href);

  return (
    <a
      key={item.label}
      href={item.href}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
        ${isActive
          ? "text-white"
          : "text-white/60 hover:text-white hover:bg-white/10"
        }
      `}
      style={isActive ? { background: "#1a7149" } : {}}
    >
      <item.icon size={20} className="flex-shrink-0" />
      <span
        className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
          sidebarExpanded || mobileOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
        }`}
      >
        {item.label}
      </span>
    </a>
  );
})}
          </div>
        </nav>

        {/* User + Bottom Nav */}
        <div className="border-t border-white/10 p-2 space-y-1">
          {bottomItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span
                className={`text-sm whitespace-nowrap transition-all duration-300 ${
                  sidebarExpanded || mobileOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                {item.label}
              </span>
            </a>
          ))}

          {/* User */}
          
          <div
            className={`mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
              sidebarExpanded || mobileOpen ? "" : "justify-center"
            }`}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
              style={{ background: "#1a7149" }}
            >
               {loading ? "..." : getInitials(user.username)}
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                sidebarExpanded || mobileOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
              }`}
            >
              <p className="text-white text-sm font-medium whitespace-nowrap">{loading ? "Loading..." : user.username || "Utilisateur"}</p>
              <p className="text-white/40 text-xs whitespace-nowrap">{loading ? "" : user.role || "—"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-visible min-w-0">
        {/* Navbar */}
        <header
          className="relative z-50 flex items-center justify-between px-6 py-4 border-b "
          style={{
            background: "rgba(249,248,243,0.85)",
            backdropFilter: "blur(12px)",
            borderColor: "#e5eadd",
            minHeight: "72px",
          }}
        >
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-brand-accent transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={20} style={{ color: "#2d4a3e" }} />
            </button>
            <div>
              <h1 className="text-xl font-bold font-sora" style={{ color: "#2d4a3e" }}>
                Pilotage Financier
              </h1>
              <p className="text-xs" style={{ color: "#2d4a3e", opacity: 0.5 }}>
                Exercice 2025 · Mise à jour il y a 5 min
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{ background: "#efefea", borderColor: "#e5eadd" }}
            >
              <Search size={16} style={{ color: "#2d4a3e", opacity: 0.4 }} />
              <input
                type="text"
                placeholder="Rechercher..."
                className="bg-transparent text-sm outline-none w-48"
                style={{ color: "#2d4a3e", fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>

            {/* Notifications */}
            <AlertDropdown />

            {/* Profile */}
            <button
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:shadow-md"
              style={{ background: "#efefea", borderColor: "#e5eadd" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#1a7149" }}
              >
                {loading ? "..." : getInitials(user.username)}
              </div>
              <span className="text-sm font-medium" style={{ color: "#2d4a3e" }}>
                {loading ? "Loading..." : user.username || "Utilisateur"}

              </span>
              <ChevronDown size={14} style={{ color: "#2d4a3e", opacity: 0.4 }} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
