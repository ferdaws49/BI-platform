// components/auth/AuthLayout.tsx
import { BarChart3, Users, Landmark, BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen font-sans">
      {/* Côté Gauche - Marketing (Caché sur mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#2d4a3e] p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Cercles décoratifs en arrière-plan */}
        <div className="absolute top-1/4 right-[-50px] w-64 h-64 border border-white/10 rounded-full" />
        
        <div className="z-10">
          <div className="flex items-center gap-2 mb-16">
            <div className="bg-white/20 p-2 rounded-lg">
              <BookOpen size={24} />
            </div>
            <span className="text-xl font-semibold tracking-tight">BI Training Center</span>
          </div>

          <h1 className="text-6xl font-bold leading-tight mb-6">
            Pilotez votre centre <br /> avec intelligence.
          </h1>
          <p className="text-white/70 text-lg max-w-md mb-12">
            Tableaux de bord en temps réel, suivi pédagogique et financier — tout en un seul espace.
          </p>

          <div className="grid grid-cols-2 gap-6 max-w-md">
            <FeatureCard icon={<BarChart3 size={20} />} title="Analytics" desc="Temps réel" />
            <FeatureCard icon={<Users size={20} />} title="Étudiants" desc="Suivi complet" />
            <FeatureCard icon={<Landmark size={20} />} title="Finances" desc="Vue globale" />
            <FeatureCard icon={<BookOpen size={20} />} title="Formations" desc="Gestion agile" />
          </div>
        </div>

        <div className="z-10 text-sm text-white/50">
          © 2026 BI Training Center — Tous droits réservés
        </div>
      </div>

      {/* Côté Droit - Formulaire */}
      <div className="w-full lg:w-1/2 bg-[#f9f8f3] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/5">
      <div className="mb-2 text-white/80">{icon}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-white/50">{desc}</div>
    </div>
  );
}