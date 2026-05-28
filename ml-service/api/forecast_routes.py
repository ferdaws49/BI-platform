"""
api/forecast_routes.py — Endpoint HTTP prévision d'inscriptions

Route : POST /forecast

Pipeline :
  1. Recevoir l'historique mensuel (ds, y) + nombre de mois à projeter
  2. Si < 3 points → config.STATIC_HISTORIQUE (mode démo, affichage)
  3. models/forecast.predict_next_months → predict only depuis .pkl (pas de fit)
  4. services/forecast.compute_tendance → hausse/baisse/stable + insight
  5. Renvoyer ForecastResponse

Monté dans main.py via app.include_router(forecast_router).
"""

import pandas as pd
from fastapi import APIRouter

from config import STATIC_HISTORIQUE
from schemas.forecast import ForecastRequest, ForecastResponse
from models.forecast import forecast_registry
from services.forecast import compute_tendance

router = APIRouter(tags=["Forecast Inscriptions"])


@router.post("/forecast", response_model=ForecastResponse)
def forecast_inscriptions(req: ForecastRequest):
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
        model_used=forecast_registry.last_model_used,
        insight=insight,
    )
