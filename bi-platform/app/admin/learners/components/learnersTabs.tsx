"use client";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface LearnersTabsProps {
  activeTab: "pending" | "validated";
  pendingCount: number;
  onTabChange: (tab: "pending" | "validated") => void;
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT : switcher entre les 2 tabs
// Tab 1 → Demandes d'inscription (statut = pending)
// Tab 2 → Liste des apprenants   (statut = accepted)
// ─────────────────────────────────────────────────────────────
export default function LearnersTabs({
  activeTab,
  pendingCount,
  onTabChange,
}: LearnersTabsProps) {
  return (
    <div className="flex gap-1 mb-6">
      {/* Tab 1 : Demandes d'inscription */}
      <button
        onClick={() => onTabChange("pending")}
        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
          activeTab === "pending"
            ? "bg-gray-900 text-white shadow-sm"
            : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
        }`}
      >
        Demandes d'inscription
        {/* Badge compteur des demandes en attente */}
        {pendingCount > 0 && (
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === "pending"
                ? "bg-amber-400 text-white"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {pendingCount}
          </span>
        )}
      </button>

      {/* Tab 2 : Liste des apprenants validés */}
      <button
        onClick={() => onTabChange("validated")}
        className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
          activeTab === "validated"
            ? "bg-gray-900 text-white shadow-sm"
            : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
        }`}
      >
        Liste des apprenants
      </button>
    </div>
  );
}
