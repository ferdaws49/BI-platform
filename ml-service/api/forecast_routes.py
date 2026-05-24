import pandas as pd
from fastapi import APIRouter

from config import STATIC_HISTORIQUE
from schemas.forecast import ForecastRequest, ForecastResponse
from models.forecast import forecast_registry
from services.forecast import compute_tendance

router = APIRouter(tags=["Forecast Inscriptions"])


@router.post("/forecast", response_model=ForecastResponse)
def forecast_inscriptions(req: ForecastRequest):
    """
    Prévision du nombre d'inscriptions pour les N prochains mois.
    Si historique vide ou < 3 points → static fallback data.
    """
    if not req.historique or len(req.historique) < 3:
        print("[Forecast] Données insuffisantes → static fallback")
        data = STATIC_HISTORIQUE
    else:
        data = [{"ds": p.ds, "y": p.y} for p in req.historique]

    df = pd.DataFrame(data)
    df["y"] = df["y"].astype(float)

    previsions = forecast_registry.predict_next_months(df, req.periodes)
    tendance, insight = compute_tendance(df["y"].tolist(), previsions)

    return ForecastResponse(
        historique=[{"mois": r["ds"], "valeur": int(r["y"])} for r in data],
        previsions=previsions,
        tendance=tendance,
        model_used=forecast_registry.model_name,
        insight=insight,
    )