"use client";

import { GraduationCap, UserCheck, Clock, UserX } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface LearnersStatsProps {
  total: number;
  valides: number; // statut = "accepted"
  enAttente: number; // statut = "pending"
  rejetes: number; // statut = "rejected"
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT : 4 cartes statistiques en haut de la page
// Basées sur le champ "statut" de l'entité Apprenant
// ─────────────────────────────────────────────────────────────
export default function LearnersStats({
  total,
  valides,
  enAttente,
  rejetes,
}: LearnersStatsProps) {
  const cards = [
    {
      label: "Total Inscriptions",
      value: total,
      icon: GraduationCap,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
      valueColor: "text-gray-800",
    },
    {
      label: "Apprenants Actifs",
      value: valides,
      icon: UserCheck,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      valueColor: "text-emerald-600",
    },
    {
      label: "Demandes en attente",
      value: enAttente,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      valueColor: "text-amber-600",
    },
    {
      label: "Rejetés",
      value: rejetes,
      icon: UserX,
      iconBg: "bg-red-50",
      iconColor: "text-red-400",
      valueColor: "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm
                       px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div
              className={`w-11 h-11 rounded-xl ${card.iconBg}
                            flex items-center justify-center flex-shrink-0`}
            >
              <Icon size={20} className={card.iconColor} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${card.valueColor}`}>
                {card.value}
              </p>
              <p className="text-xs text-gray-400 font-medium">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
