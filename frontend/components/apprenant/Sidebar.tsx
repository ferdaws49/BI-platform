'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, BookOpen, ClipboardList, 
  BarChart3, Calendar, User, LogOut, 
  DollarSign
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const navItems = [
  { name: 'Tableau de bord', href: '/apprenant/dashboard', icon: LayoutDashboard },
  { name: 'Mes formations', href: '/apprenant/trainings', icon: BookOpen },
  { name: 'Mes inscriptions', href: '/apprenant/registrations', icon: ClipboardList },
  { name: 'Mes résultats', href: '/apprenant/results', icon: BarChart3 },
  { name: 'Planning des sessions', href: '/apprenant/schedule', icon: Calendar },
  { name: 'Mes paiements', href: '/apprenant/paiement', icon: DollarSign },
  { name: 'Mon profil', href: '/apprenant/profile', icon: User },
];

// ─── LOGO SVG MBIcenter — IDs UNIQUES avec préfixe "sb-" ───
const LogoSVG = () => (
  <svg
    viewBox="0 0 600 600"
    className="w-10 h-10"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <filter id="sb-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feFlood floodColor="white" floodOpacity="0.4" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="sb-glow-strong" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feFlood floodColor="white" floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <linearGradient id="sb-circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.9" />
        <stop offset="100%" stopColor="white" stopOpacity="0.3" />
      </linearGradient>

      <linearGradient id="sb-barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="1" />
        <stop offset="100%" stopColor="white" stopOpacity="0.7" />
      </linearGradient>
    </defs>

    {/* Cercle extérieur */}
    <circle
      cx="300"
      cy="280"
      r="185"
      fill="none"
      stroke="url(#sb-circleGrad)"
      strokeWidth="4"
      opacity="0.8"
    />
    <circle
      cx="300"
      cy="280"
      r="165"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      opacity="0.3"
      strokeDasharray="6 6"
    />

    {/* Ligne de séparation */}
    <line
      x1="300"
      y1="120"
      x2="300"
      y2="440"
      stroke="white"
      strokeWidth="2"
      opacity="0.4"
      strokeDasharray="4 4"
    />

    {/* === CERVEAU GAUCHE === */}
    <path
      d="M 170 200 C 150 180, 140 220, 145 250 C 135 270, 145 300, 160 320 C 150 350, 170 380, 200 390 C 220 410, 260 400, 280 380 L 300 380 L 300 160 C 270 150, 240 160, 220 180 C 200 170, 180 180, 170 200Z"
      fill="none"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#sb-glow)"
    />

    {/* Gyri détails */}
    <path
      d="M 180 220 C 200 210, 220 230, 215 250"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M 175 280 C 195 270, 210 285, 205 305"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M 195 340 C 215 330, 235 345, 230 365"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.7"
    />

    {/* Nodes */}
    <circle cx="195" cy="235" r="7" fill="white" filter="url(#sb-glow-strong)" />
    <circle cx="185" cy="295" r="7" fill="white" filter="url(#sb-glow-strong)" />
    <circle cx="210" cy="355" r="7" fill="white" filter="url(#sb-glow-strong)" />
    <circle cx="255" cy="320" r="7" fill="white" filter="url(#sb-glow-strong)" />

    {/* Connexions */}
    <path
      d="M 195 235 L 220 260 L 185 295"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
    <path
      d="M 185 295 L 210 320 L 210 355"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
    <path
      d="M 210 355 L 240 340 L 255 320"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
    <path
      d="M 255 320 L 280 320"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.8"
    />

    {/* === GRAPHIQUE DROITE === */}
    <rect
      x="330"
      y="310"
      width="28"
      height="90"
      rx="5"
      fill="url(#sb-barGrad)"
      opacity="0.85"
      filter="url(#sb-glow)"
    />
    <rect
      x="375"
      y="260"
      width="28"
      height="140"
      rx="5"
      fill="url(#sb-barGrad)"
      opacity="1"
      filter="url(#sb-glow)"
    />
    <rect
      x="420"
      y="335"
      width="28"
      height="65"
      rx="5"
      fill="url(#sb-barGrad)"
      opacity="0.7"
      filter="url(#sb-glow)"
    />

    {/* Ligne tendance */}
    <path
      d="M 315 380 L 360 340 L 405 355 L 460 280"
      fill="none"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#sb-glow-strong)"
    />
    <path
      d="M 445 295 L 460 280 L 455 300"
      fill="none"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#sb-glow-strong)"
    />

    {/* Points sur la ligne */}
    <circle cx="360" cy="340" r="5" fill="white" filter="url(#sb-glow-strong)" />
    <circle cx="405" cy="355" r="5" fill="white" filter="url(#sb-glow-strong)" />
    <circle cx="460" cy="280" r="5" fill="white" filter="url(#sb-glow-strong)" />

    {/* === TEXTE DANS SVG === */}
    <text
      x="300"
      y="540"
      textAnchor="middle"
      fill="white"
      fontFamily="'Segoe UI', system-ui, sans-serif"
      fontSize="52"
      fontWeight="800"
      letterSpacing="0.04em"
      filter="url(#sb-glow)"
    >
      MBIcenter
    </text>
    <text
      x="300"
      y="570"
      textAnchor="middle"
      fill="white"
      fontFamily="'Segoe UI', system-ui, sans-serif"
      fontSize="16"
      fontWeight="400"
      letterSpacing="0.15em"
      opacity="0.7"
    >
      INTELLIGENCE · DATA · GROWTH
    </text>
  </svg>
);

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event("auth-state-changed"));
    router.push('/auth/login');
  };

  return (
    <div className="flex flex-col h-full">
      {/* LOGO */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-gradient-to-br from-[#1b5333] to-[#2d7a4f] p-1.5 rounded-xl shadow-lg">
          <LogoSVG />
        </div>
        <span className="font-bold text-xl text-[#2d4a3e] tracking-tight">MBIcenter</span>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 space-y-1.5">
        {navItems.map((item) => {
          // ✅ CORRECTION ICI : match exact OU sous-page
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                isActive 
                ? 'bg-[#2d4a3e] text-white shadow-lg shadow-[#2d4a3e]/20' 
                : 'text-gray-400 hover:bg-[#efefea] hover:text-[#2d4a3e]'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="p-6 border-t border-gray-50">
        <button onClick={handleLogout}
         className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-red-400 hover:bg-red-50 rounded-xl transition-all">
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </div>
  );
}