"""
Script d'entraînement — Modèle prévision inscriptions
Lancer : python -m training.train_forecast

Génère : models/forecast_model.pkl
"""

import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.linear_model import LinearRegression
import warnings

warnings.filterwarnings("ignore")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

# ─── Data ─────────────────────────────────────────────────────────────────────

# Quand la DB est prête — remplacer generate_data() par:
# from data.postgres_loader import load_inscriptions_data
# def generate_data():
#     df = load_inscriptions_data()  # colonnes: ds (YYYY-MM), y (int)
#     assert len(df) >= 3, "Pas assez de mois historiques (minimum 3)"
#     return df

STATIC_HISTORIQUE = [
    {"ds": "2024-10", "y": 8},
    {"ds": "2024-11", "y": 12},
    {"ds": "2024-12", "y": 10},
    {"ds": "2025-01", "y": 18},
    {"ds": "2025-02", "y": 22},
    {"ds": "2025-03", "y": 19},
    {"ds": "2025-04", "y": 28},
]

def generate_data():
    df = pd.DataFrame(STATIC_HISTORIQUE)
    df["y"] = df["y"].astype(float)
    return df


# ─── Train ────────────────────────────────────────────────────────────────────

def train():
    df = generate_data()
    df["t"] = range(len(df))

    X = df[["t"]].values
    y = df["y"].values

    model = LinearRegression().fit(X, y)

    joblib.dump(
        {
            "model":      model,
            "last_data":  df,
            "model_name": "LinearTrend",
        },
        MODELS_DIR / "forecast_model.pkl",
    )
    print(f"[train_forecast] ✅ LinearTrend sauvegardé dans models/forecast_model.pkl ({len(df)} mois)")


if __name__ == "__main__":
    train()