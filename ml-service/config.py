# ─── Configuration globale ────────────────────────────────────────────────────

CORS_ORIGINS = [
    "http://localhost:5000",
    "http://localhost:3000",
]

# Fallback si historique insuffisant (< 3 mois) — démo / dev
STATIC_HISTORIQUE = [
    {"ds": "2024-10", "y": 8},
    {"ds": "2024-11", "y": 12},
    {"ds": "2024-12", "y": 10},
    {"ds": "2025-01", "y": 18},
    {"ds": "2025-02", "y": 22},
    {"ds": "2025-03", "y": 19},
    {"ds": "2025-04", "y": 28},
]

# Seuils métier pour les niveaux de risque
RISK_THRESHOLDS = {
    "critique": 75,
    "eleve": 55,
    "modere": 35,
}

# Poids des features (documentés ici pour référence UI)
FEATURE_WEIGHTS = {
    "presence": 0.40,
    "notes": 0.35,
    "satisfaction": 0.15,
    "paiements": 0.10,
}

FEATURE_NAMES = [
    "taux_presence",
    "absences_consecutives",
    "moyenne_notes",
    "tendance_notes",
    "moyenne_satisfaction",
    "jours_retard_paiement",
]