"""
api/predict_routes.py — Endpoint HTTP risque d'abandon

Route : POST /predict

Pipeline :
  1. Valider la requête (schemas/risk.PredictRequest)
  2. Construire la matrice de features dans l'ordre FEATURE_NAMES
  3. Convertir None → NaN pour l'imputer sklearn
  4. Appeler models/registry.predict → probabilités
  5. Enrichir avec services/risk (niveau + facteurs texte)
  6. Renvoyer PredictResponse
"""

import math
from fastapi import APIRouter, HTTPException

from config import FEATURE_NAMES, FEATURE_WEIGHTS
from schemas.risk import PredictRequest, PredictResponse, RiskResult
from models.registry import registry
from services.risk import score_to_level, build_factors

router = APIRouter(tags=["Risk Prediction"])


def _to_float(val: float | None) -> float:
    """Convertit Optional[float] en float (None → NaN pour numpy/sklearn)."""
    if val is None:
        return float("nan")
    return float(val)


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not req.apprenants:
        raise HTTPException(status_code=400, detail="Liste d'apprenants vide")

    # Ordre des colonnes = ordre d'entraînement dans train_risk.FEATURES
    # None → NaN pour que SimpleImputer (mean training) les remplace
    feature_matrix = [
        [
            f.taux_presence,
            float(f.absences_consecutives),
            _to_float(f.moyenne_notes),
            _to_float(f.tendance_notes),
            _to_float(f.moyenne_satisfaction),
            float(f.jours_retard_paiement),
        ]
        for f in req.apprenants
    ]

    probabilities = registry.predict(feature_matrix)

    results = []
    for i, apprenant in enumerate(req.apprenants):
        prob = float(probabilities[i])
        # Score affiché 0–100 (proba × 100), plafonné pour l'UI
        risk_score = min(100, int(round(prob * 100)))
        results.append(RiskResult(
            apprenant_id=apprenant.apprenant_id,
            risk_score=risk_score,
            risk_level=score_to_level(risk_score),
            risk_probability=round(prob, 4),
            factors=build_factors(apprenant),
            model_used=registry.model_name,
        ))

    return PredictResponse(
        results=results,
        model_info={
            "model":        registry.model_name,
            "features":     FEATURE_NAMES,
            "weights_used": FEATURE_WEIGHTS,
        },
    )