"""
training/train_forecast.py — Entraînement hors ligne (Option B)

Commande : python -m training.train_forecast
Sortie   : models/forecast_model.pkl

1. Split chronologique 80/20 → comparer LinearTrend vs Prophet (MAE test)
2. Entraîner le modèle retenu sur tout l'historique offline disponible
3. Sauvegarder le .pkl — /forecast ne fait que predict (pas de fit)

Relancer ce script quand la DB a de nouveaux mois (modèle figé jusqu'au prochain train).
"""

import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.linear_model import LinearRegression
import warnings
import os

USE_DB = os.getenv("USE_DB", "0") in ("1", "true", "True")
try:
    from data.postgres_loader import load_inscriptions_data
except Exception:
    load_inscriptions_data = None

from training.eval_utils import print_regression_metrics

warnings.filterwarnings("ignore")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

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


def _eval_linear(train_df: pd.DataFrame, test_df: pd.DataFrame) -> tuple:
    train = train_df.copy()
    train["t"] = range(len(train))
    test = test_df.copy()
    test["t"] = range(len(train), len(train) + len(test))

    model = LinearRegression()
    model.fit(train[["t"]], train["y"])
    y_pred = model.predict(test[["t"]])
    metrics = print_regression_metrics("LinearTrend (test)", test["y"].values, y_pred)
    return metrics


def _eval_prophet(train_df: pd.DataFrame, test_df: pd.DataFrame) -> tuple | None:
    try:
        from prophet import Prophet
    except ImportError:
        print("[train_forecast] Prophet non installe → pip install prophet")
        return None

    train = train_df.copy()
    train["ds"] = pd.to_datetime(train["ds"])

    m = Prophet(
        yearly_seasonality=len(train) >= 24,
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode="additive",
        interval_width=0.80,
    )
    m.fit(train[["ds", "y"]])

    future = m.make_future_dataframe(periods=len(test_df), freq="MS")
    forecast = m.predict(future)
    y_pred = forecast.tail(len(test_df))["yhat"].values
    metrics = print_regression_metrics("Prophet (test)", test_df["y"].values, y_pred)
    return metrics


def _fit_linear_production(df: pd.DataFrame) -> LinearRegression:
    data = df.copy()
    data["t"] = range(len(data))
    model = LinearRegression()
    model.fit(data[["t"]], data["y"])
    return model


def _fit_prophet_production(df: pd.DataFrame):
    from prophet import Prophet

    prophet_df = df.copy()
    prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])
    m = Prophet(
        yearly_seasonality=len(prophet_df) >= 24,
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode="additive",
        interval_width=0.80,
    )
    m.fit(prophet_df[["ds", "y"]])
    return m


def train():
    if USE_DB and load_inscriptions_data is not None:
        df = load_inscriptions_data()
    else:
        df = generate_data()
    split_index = int(len(df) * 0.8)
    train_df = df.iloc[:split_index].reset_index(drop=True)
    test_df = df.iloc[split_index:].reset_index(drop=True)

    print(f"[train_forecast] Split evaluation : {len(train_df)} train / {len(test_df)} test")

    metrics_linear = _eval_linear(train_df, test_df)
    mae_linear = metrics_linear["mae"]

    metrics_prophet = _eval_prophet(train_df, test_df)
    if metrics_prophet is not None and metrics_prophet["mae"] <= mae_linear:
        model_name = "Prophet"
        test_metrics = metrics_prophet
        production_model = _fit_prophet_production(df)
        print(f"\n[train_forecast] Retenu : Prophet (MAE test = {metrics_prophet['mae']:.4f})")
    else:
        model_name = "LinearTrend"
        test_metrics = metrics_linear
        production_model = _fit_linear_production(df)
        reason = "Prophet indisponible" if metrics_prophet is None else f"MAE test = {mae_linear:.4f}"
        print(f"\n[train_forecast] Retenu : LinearTrend ({reason})")

    # LinearTrend toujours sauvegardé pour fallback runtime (Option B + résilience)
    linear_fallback = _fit_linear_production(df)

    joblib.dump(
        {
            "model":           production_model,
            "model_name":      model_name,
            "linear_fallback": linear_fallback,
            "last_data":       df,
            "test_metrics":    test_metrics,
        },
        MODELS_DIR / "forecast_model.pkl",
    )
    print(
        f"[train_forecast] OK Sauvegarde : models/forecast_model.pkl "
        f"(principal={model_name}, fallback=LinearTrend, {len(df)} mois, predict only)"
    )


if __name__ == "__main__":
    train()
