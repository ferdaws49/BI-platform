from fastapi import APIRouter, HTTPException

from config import FEATURE_NAMES, FEATURE_WEIGHTS
from schemas.risk import PredictRequest, PredictResponse, RiskResult
from models.registry import registry
from services.risk import score_to_level, build_factors

router = APIRouter(tags=["Risk Prediction"])


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """
    Pipeline risque d'abandon :
    features JSON → matrice numpy → proba ML → score 0-100 → niveau + facteurs texte
    """
    if not req.apprenants:
        raise HTTPException(status_code=400, detail="Liste d'apprenants vide")

    feature_matrix = [
        [
            f.taux_presence,
            float(f.absences_consecutives),
            f.moyenne_notes,
            f.tendance_notes,
            f.moyenne_satisfaction,
            float(f.jours_retard_paiement),
        ]
        for f in req.apprenants
    ]

    probabilities = registry.predict(feature_matrix)

    results = []
    for i, apprenant in enumerate(req.apprenants):
        prob = float(probabilities[i])
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
            "model":       registry.model_name,
            "features":    FEATURE_NAMES,
            "weights_used": FEATURE_WEIGHTS,
        },
    )