"use client";

// ─────────────────────────────────────────────────────────────
// COMPOSANTS UTILITAIRES : badges + toggle + avatar
// Utilisés dans UsersTable
//
// ❌ StatutBadge supprimé — il affichait "actif/inactif" basé sur
//    l'ancien champ "statut" qui est remplacé par "isActive: boolean"
//    Le label texte est maintenant inline dans UsersTable directement
// ─────────────────────────────────────────────────────────────

// ── Helper : génère les initiales d'un nom complet ──────────
// ex: "Ahmed Benmoussa" → "AB"
export function getInitials(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "??";
  return trimmed
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Couleurs d'avatar déterministes selon le nom ─────────────
const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
];

function getAvatarColor(name: string): string {
  if (!name) return "bg-gray-400";
  const sum = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// ── Avatar circulaire avec initiales colorées ────────────────
export function UserAvatar({ name }: { name: string }) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center
                  text-white text-xs font-semibold flex-shrink-0
                  ${getAvatarColor(name)}`}
    >
      {getInitials(name)}
    </div>
  );
}

// ── Badge coloré selon le rôle ───────────────────────────────
// Admin → violet | Directeur → teal | Resp. Pédagogique → amber
export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    Admin:               "bg-purple-50 text-purple-700 border border-purple-200",
    Directeur:           "bg-teal-50 text-teal-700 border border-teal-200",
    "Resp. Pédagogique": "bg-amber-50 text-amber-700 border border-amber-200",
  };

  return (
    <span
      className={`text-xs font-medium px-2.5 py-0.5 rounded-full
                  ${styles[role] ?? "bg-gray-100 text-gray-500"}`}
    >
      {role}
    </span>
  );
}

// ── Toggle switch ON/OFF ─────────────────────────────────────
// Utilisé pour contrôler isActive (activation/désactivation)
// checked = true  → compte actif  (vert)
// checked = false → compte inactif (gris)
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      title={checked ? "Désactiver le compte" : "Activer le compte"}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0
                  ${checked ? "bg-emerald-500" : "bg-gray-200"}`}
    >
      {/* Rond blanc qui se déplace selon l'état */}
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full
                    shadow transition-transform
                    ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}