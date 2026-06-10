"""
schemas/risk.py — Pydantic schemas pour l'API /predict

Accepte null sur les features optionnelles pour laisser
l'imputer (SimpleImputer mean) du training faire son travail.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class ApprenantFeatures(BaseModel):
    """Features brutes envoyées par NestJS. null = donnée manquante."""
    apprenant_id:          int
    taux_presence:         float = Field(..., ge=0, le=1)
    absences_consecutives: float = Field(default=0, ge=0)
    moyenne_notes:         Optional[float] = Field(default=None, ge=0, le=20)
    tendance_notes:        Optional[float] = Field(default=None)
    moyenne_satisfaction:  Optional[float] = Field(default=None, ge=0, le=5)
    jours_retard_paiement: float = Field(default=0, ge=0)


class RiskResult(BaseModel):
    apprenant_id:      int
    risk_score:        int           # 0–100
    risk_level:        str           # faible | modere | eleve | critique
    risk_probability:  float         # vraie proba ML (0–1)
    factors:           dict[str, str]
    model_used:        str


class PredictRequest(BaseModel):
    apprenants: List[ApprenantFeatures]


class PredictResponse(BaseModel):
    results:    List[RiskResult]
    model_info: dict