"""
schemas/forecast.py — Contrat JSON pour l'API prévision d'inscriptions

Rôle : format des séries temporelles mensuelles (mois + effectif).
       Convention Prophet-like : colonne ds (date) + y (valeur).

Flux :
  Backend BI  →  ForecastRequest (historique + nb de mois à projeter)
              →  POST /forecast
              →  ForecastResponse (courbe passée, prévisions, tendance, insight)

Fichiers liés :
  - api/forecast_routes.py  : endpoint
  - models/forecast.py      : régression linéaire sur l'indice temps t
  - services/forecast.py    : libellé hausse/baisse/stable pour le directeur
"""

from pydantic import BaseModel
from typing import List


class InscriptionPoint(BaseModel):
    """Un mois d'historique : ds au format YYYY-MM, y = nombre d'inscriptions."""
    ds: str    # ex. "2024-01"
    y: int


class ForecastRequest(BaseModel):
    """
    historique : au moins 3 points recommandés (sinon fallback config.STATIC_HISTORIQUE)
    periodes   : horizon de prévision en mois (défaut 3)
    """
    historique: List[InscriptionPoint]
    periodes: int = 3


class ForecastPoint(BaseModel):
    """Un mois futur prédit avec fourchette simplifiée (± demi-écart-type historique)."""
    mois: str
    valeur_prevue: int
    borne_basse: int
    borne_haute: int


class ForecastResponse(BaseModel):
    historique: List[dict]              # [{mois, valeur}, ...]
    previsions: List[ForecastPoint]
    tendance: str                       # "hausse" | "baisse" | "stable"
    model_used: str                     # ex. "LinearTrend"
    insight: str                        # phrase lisible pour le directeur
