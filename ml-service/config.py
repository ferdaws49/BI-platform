# ─── Configuration globale ────────────────────────────────────────────────────
#
# Constantes partagées par les modules Risk et Forecast.
# Pas de secrets ici : uniquement seuils métier, CORS et données de secours.

CORS_ORIGINS = [
    "http://localhost:5000",
    "http://localhost:3000",
]

# ─── Forecast ───────────────────────────────────────────────────────────────────
# Utilisé par api/forecast_routes.py si l'appelant envoie < 3 mois d'historique.

STATIC_HISTORIQUE = [
    {"ds": "2024-10", "y": 8},
    {"ds": "2024-11", "y": 12},
    {"ds": "2024-12", "y": 10},
    {"ds": "2025-01", "y": 18},
    {"ds": "2025-02", "y": 22},
    {"ds": "2025-03", "y": 19},
    {"ds": "2025-04", "y": 28},
]

# ─── Risk ───────────────────────────────────────────────────────────────────────
# Seuils sur risk_score (0–100) → libellés dans services/risk.score_to_level

RISK_THRESHOLDS = {
    "critique": 75,
    "eleve": 55,
    "modere": 35,
}

# Poids affichés dans l'UI (documentation) ; le modèle ML n'utilise pas ces constantes.
FEATURE_WEIGHTS = {
    "presence": 0.40,
    "notes": 0.35,
    "satisfaction": 0.15,
    "paiements": 0.10,
}

# Ordre des colonnes envoyées au modèle — doit rester aligné avec predict_routes.py
FEATURE_NAMES = [
    "taux_presence",
    "absences_consecutives",
    "moyenne_notes",
    "tendance_notes",
    "moyenne_satisfaction",
    "jours_retard_paiement",
]
