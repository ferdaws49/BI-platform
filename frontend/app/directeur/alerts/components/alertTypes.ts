export type AlertFilterOptions = {
  type: "Tous" | "Critique" | "Avertissement" | "Information";
  statut: "Tous" | "Non traité" | "Traité";
  periode:
    | "24 dernières heures"
    | "7 derniers jours"
    | "30 derniers jours"
    | "Tous";
};

export type AlertSeverity = "Critique" | "Avertissement" | "Information";
export type AlertStatus = "Non traité" | "Traité";
