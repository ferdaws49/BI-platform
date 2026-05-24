from pydantic import BaseModel
from typing import List


class InscriptionPoint(BaseModel):
    """Un point historique : mois + nombre d'inscriptions."""
    ds: str    # format: "2024-01"
    y: int


class ForecastRequest(BaseModel):
    historique: List[InscriptionPoint]
    periodes: int = 3              # nb mois à prédire (défaut: 3)


class ForecastPoint(BaseModel):
    mois: str
    valeur_prevue: int
    borne_basse: int
    borne_haute: int


class ForecastResponse(BaseModel):
    historique: List[dict]
    previsions: List[ForecastPoint]
    tendance: str                  # "hausse" / "baisse" / "stable"
    model_used: str
    insight: str                   # explication pour le directeur