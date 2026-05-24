from pydantic import BaseModel
from typing import List


class ApprenantFeatures(BaseModel):
    """Indicateurs agrégés d'un apprenant, calculés côté backend avant l'appel ML."""
    apprenant_id: int
    # Présence (weight 40%)
    taux_presence: float          # 0.0 → 1.0
    absences_consecutives: int    # nb séances manquées d'affilée
    # Notes (weight 35%)
    moyenne_notes: float          # 0 → 20
    tendance_notes: float         # positif = en hausse, négatif = en baisse
    # Satisfaction (weight 15%)
    moyenne_satisfaction: float   # 0 → 5
    # Paiements (weight 10%)
    jours_retard_paiement: int    # 0 = à jour


class PredictRequest(BaseModel):
    """Batch : plusieurs apprenants en une seule requête."""
    apprenants: List[ApprenantFeatures]


class RiskResult(BaseModel):
    """Réponse par apprenant : score, niveau, proba brute et facteurs explicatifs."""
    apprenant_id: int
    risk_score: int               # 0-100
    risk_level: str               # critique / eleve / modere / faible
    risk_probability: float       # 0.0-1.0 (raw ML output)
    factors: dict
    model_used: str


class PredictResponse(BaseModel):
    results: List[RiskResult]
    model_info: dict