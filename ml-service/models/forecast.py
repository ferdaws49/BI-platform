"""
ForecastRegistry — charge le modèle prévision inscriptions depuis forecast_model.pkl
Lancer d'abord : python -m training.train_forecast
"""

import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from schemas.forecast import ForecastPoint

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "forecast_model.pkl"


class ForecastRegistry:
    def __init__(self):
        self.model      = None
        self.last_data  = None
        self.model_name = ""
        self._load()

    def _load(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "❌ models/forecast_model.pkl introuvable. "
                "Lance d'abord : python -m training.train_forecast"
            )
        bundle          = joblib.load(MODEL_PATH)
        self.model      = bundle["model"]
        self.last_data  = bundle["last_data"]
        self.model_name = bundle["model_name"]
        print(f"[ForecastRegistry] ✅ Modèle forecast chargé : {self.model_name}")

    def predict_next_months(self, df: pd.DataFrame, periodes: int) -> list:
        """Prédit les N prochains mois à partir de l'historique fourni."""
        df = df.copy()
        df["t"] = range(len(df))
        last_date = pd.to_datetime(df["ds"].iloc[-1])

        previsions = []
        for i in range(1, periodes + 1):
            t_next = len(df) + i - 1
            val    = max(0, int(round(self.model.predict([[t_next]])[0])))
            std    = max(1, int(np.std(df["y"].values) * 0.5))
            next_month = last_date + pd.DateOffset(months=i)
            previsions.append(ForecastPoint(
                mois=next_month.strftime("%Y-%m"),
                valeur_prevue=val,
                borne_basse=max(0, val - std),
                borne_haute=val + std,
            ))
        return previsions


# Singleton
forecast_registry = ForecastRegistry()