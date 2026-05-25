"""
models/registry.py — Chargement et inférence du modèle RISQUE (abandon)

Rôle : singleton chargé au démarrage FastAPI (import dans main.py).
       Lit models/risk_model.pkl produit par training/train_risk.py.

Contenu du .pkl :
  - model      : LogisticRegression ou RandomForest (meilleur AUC en CV)
  - scaler     : StandardScaler appris à l'entraînement
  - model_name : nom du candidat retenu
  - features   : liste des colonnes (ordre important)

Fichiers liés :
  - training/train_risk.py
  - api/predict_routes.py → registry.predict()
"""

import numpy as np
import joblib
from pathlib import Path
from typing import List

MODEL_PATH = Path(__file__).resolve().parent / "risk_model.pkl"


class ModelRegistry:
    def __init__(self):
        self.model      = None
        self.scaler     = None
        self.imputer    = None
        self.model_name = ""
        self.features   = []
        self._load()

    def _load(self):
        """Échoue au démarrage si le .pkl n'existe pas → force l'entraînement préalable."""
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "❌ models/risk_model.pkl introuvable. "
                "Lance d'abord : python -m training.train_risk"
            )
        bundle          = joblib.load(MODEL_PATH)
        self.model      = bundle["model"]
        self.scaler     = bundle["scaler"]
        self.imputer    = bundle.get("imputer")
        self.model_name = bundle["model_name"]
        self.features   = bundle["features"]
        print(f"[ModelRegistry] ✅ Modèle risque chargé : {self.model_name}")

    def predict(self, features: List[List[float]]) -> np.ndarray:
        """
        Entrée : matrice [n_apprenants × 6 features] (même ordre qu'à l'entraînement).
        Sortie : vecteur de P(abandon) — colonne 1 de predict_proba.
        """
        X = np.array(features)
        if self.imputer is not None:
            X = self.imputer.transform(X)
        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)[:, 1]


# Une seule instance partagée par toute l'application
registry = ModelRegistry()
