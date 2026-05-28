"""
schemas/risk.py — Contrat JSON pour l'API risque d'abandon (Alerts IA)

Rôle : définir la forme des requêtes/réponses FastAPI (validation Pydantic).
       Aucune logique ML ici : le backend .NET envoie des features déjà agrégées.

Flux :
  Backend BI  →  PredictRequest (liste d'apprenants + 6 indicateurs)
              →  POST /predict
              →  PredictResponse (scores, niveaux, facteurs texte)

Fichiers liés :
  - api/predict_routes.py   : endpoint qui utilise ces schémas
  - services/risk.py        : conversion score → niveau + messages UI
  - models/registry.py      : prédiction P(abandon)
"""

from pydantic import BaseModel
from typing import List


class ApprenantFeatures(BaseModel):
    """
    Une ligne = un apprenant avec ses indicateurs calculés côté DWH/backend.
    L'ordre des champs doit correspondre à FEATURE_NAMES dans config.py.
    """
    apprenant_id: int
    # Présence (poids documenté UI : 40 %)
    taux_presence: float          # 0.0 → 1.0
    absences_consecutives: int    # nb séances manquées d'affilée
    # Notes (35 %)
    moyenne_notes: float          # 0 → 20
    tendance_notes: float         # positif = en hausse, négatif = en baisse
    # Satisfaction (15 %)
    moyenne_satisfaction: float   # 0 → 5
    # Paiements (10 %)
    jours_retard_paiement: int    # 0 = à jour


class PredictRequest(BaseModel):
    """Entrée POST /predict : traitement par lot (plusieurs apprenants)."""
    apprenants: List[ApprenantFeatures]


class RiskResult(BaseModel):
    """
    Sortie par apprenant.
    - risk_probability : sortie brute du classifieur (0–1)
    - risk_score       : même proba × 100, arrondie (affichage dashboard)
    - risk_level       : libellé métier (seuils dans config.RISK_THRESHOLDS)
    - factors          : textes explicatifs (règles dans services/risk.py)
    """
    apprenant_id: int
    risk_score: int               # 0-100
    risk_level: str               # critique / eleve / modere / faible
    risk_probability: float       # 0.0-1.0 (sortie ML brute)
    factors: dict
    model_used: str


class PredictResponse(BaseModel):
    """Réponse complète + métadonnées du modèle pour le front."""
    results: List[RiskResult]
    model_info: dict
