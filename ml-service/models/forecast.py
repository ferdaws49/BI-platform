"""
models/forecast.py — Inférence prévision inscriptions (Option B + fallback)

Training (offline) :
  - Compare Prophet vs LinearTrend sur split 80/20
  - Sauvegarde modèle principal + LinearTrend de secours dans .pkl

API (predict only) :
  - Charge le .pkl, predict sans fit
  - Si Prophet échoue → LinearTrend fallback + log explicite
"""

import logging
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from schemas.forecast import ForecastPoint

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).resolve().parent / "forecast_model.pkl"


class ForecastRegistry:
    def __init__(self):
        self.model              = None
        self.linear_fallback    = None
        self.last_data          = None
        self.model_name         = ""          # modèle choisi à l'entraînement
        self.last_model_used    = ""          # modèle réellement utilisé à la dernière requête
        self._load()

    def _load(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "models/forecast_model.pkl introuvable. "
                "Lance : python -m training.train_forecast"
            )
        bundle = joblib.load(MODEL_PATH)
        self.model           = bundle["model"]
        self.linear_fallback = bundle.get("linear_fallback")
        self.last_data       = bundle.get("last_data")
        self.model_name      = bundle["model_name"]
        self.last_model_used = self.model_name

        logger.info(
            "[ForecastRegistry] Charge : principal=%s, fallback_linear=%s",
            self.model_name,
            "oui" if self.linear_fallback is not None else "non",
        )
        print(
            f"[ForecastRegistry] Principal={self.model_name} | "
            f"fallback_linear={'oui' if self.linear_fallback else 'non'} (predict only)"
        )

    def predict_next_months(self, df: pd.DataFrame, periodes: int) -> list:
        """
        df : utilisé pour logs / cohérence affichage uniquement (pas de fit).
        """
        if self.model_name == "Prophet":
            try:
                self._validate_prophet_model()
                result = self._predict_prophet(periodes)
                self.last_model_used = "Prophet"
                logger.info("[Forecast] Prediction via Prophet (%s mois)", periodes)
                return result
            except Exception as e:
                logger.warning(
                    "[Forecast] Prophet indisponible ou erreur predict : %s → fallback LinearTrend",
                    e,
                )
                print(f"[Forecast] Fallback LinearTrend : {e}")

        return self._predict_with_linear_fallback(periodes, reason="primary_or_fallback")

    def _validate_prophet_model(self):
        if self.model is None:
            raise ValueError("Modele Prophet absent du .pkl")
        if not hasattr(self.model, "make_future_dataframe"):
            raise TypeError(f"Type inattendu dans .pkl : {type(self.model)}")

    def _predict_prophet(self, periodes: int) -> list:
        future = self.model.make_future_dataframe(periods=periodes, freq="MS")
        forecast = self.model.predict(future)
        future_rows = forecast.tail(periodes)

        previsions = []
        for _, row in future_rows.iterrows():
            val = max(0, int(round(row["yhat"])))
            previsions.append(ForecastPoint(
                mois=row["ds"].strftime("%Y-%m"),
                valeur_prevue=val,
                borne_basse=max(0, int(round(row["yhat_lower"]))),
                borne_haute=max(0, int(round(row["yhat_upper"]))),
            ))
        return previsions

    def _predict_with_linear_fallback(self, periodes: int, reason: str) -> list:
        linear = self.linear_fallback if self.linear_fallback is not None else self.model
        if linear is None or not hasattr(linear, "predict"):
            raise RuntimeError(
                "Aucun modele LinearTrend disponible pour le fallback. "
                "Relance : python -m training.train_forecast"
            )

        ref = self.last_data.copy()
        n = len(ref)
        last_date = pd.to_datetime(ref["ds"].iloc[-1])

        previsions = []
        for i in range(1, periodes + 1):
            t_next = n + i - 1
            val = max(0, int(round(linear.predict([[t_next]])[0])))
            std = max(1, int(np.std(ref["y"].values) * 0.5))
            next_month = last_date + pd.DateOffset(months=i)
            previsions.append(ForecastPoint(
                mois=next_month.strftime("%Y-%m"),
                valeur_prevue=val,
                borne_basse=max(0, val - std),
                borne_haute=val + std,
            ))

        if self.model_name == "LinearTrend":
            self.last_model_used = "LinearTrend"
            logger.info("[Forecast] Prediction via LinearTrend (%s mois)", periodes)
        else:
            self.last_model_used = "LinearTrend (fallback)"
            logger.info(
                "[Forecast] Prediction via LinearTrend fallback (%s mois, reason=%s)",
                periodes,
                reason,
            )

        return previsions


forecast_registry = ForecastRegistry()
