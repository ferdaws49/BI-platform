"""
ModelRegistry — charge le modèle risque d'abandon depuis risk_model.pkl
Lancer d'abord : python -m training.train_risk
"""

import numpy as np
import joblib
from pathlib import Path
from typing import List

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "risk_model.pkl"


class ModelRegistry:
    def __init__(self):
        self.model      = None
        self.scaler     = None
        self.model_name = ""
        self.features   = []
        self._load()

    def _load(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "❌ models/risk_model.pkl introuvable. "
                "Lance d'abord : python -m training.train_risk"
            )
        bundle          = joblib.load(MODEL_PATH)
        self.model      = bundle["model"]
        self.scaler     = bundle["scaler"]
        self.model_name = bundle["model_name"]
        self.features   = bundle["features"]
        print(f"[ModelRegistry] ✅ Modèle risque chargé : {self.model_name}")

    def predict(self, features: List[List[float]]) -> np.ndarray:
        """Retourne P(abandon) pour chaque ligne."""
        X = np.array(features)
        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)[:, 1]


# Singleton
registry = ModelRegistry()