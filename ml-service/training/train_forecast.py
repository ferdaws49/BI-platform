"""
training/train_forecast.py

Commande: python -m training.train_forecast

Modes:
  USE_DEMO=1  -> demo_realiste.csv (donnees simulees, beaux chiffres)
  USE_DB=1    -> PostgreSQL (donnees reelles)
  sinon       -> STATIC_HISTORIQUE (fallback)
"""

import os
import warnings
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

load_dotenv()

USE_DB = os.getenv("USE_DB", "0") in ("1", "true", "True")
USE_DEMO = os.getenv("USE_DEMO", "0") in ("1", "true", "True")
print("[train_forecast] USE_DB=" + str(USE_DB) + " | USE_DEMO=" + str(USE_DEMO))

try:
    from data.postgres_loader import load_inscriptions_data
except Exception:
    load_inscriptions_data = None

warnings.filterwarnings("ignore")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

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


def load_demo_data():
    demo_path = DATA_DIR / "demo_realiste.csv"
    if not demo_path.exists():
        raise FileNotFoundError("Fichier demo manquant: " + str(demo_path))
    df = pd.read_csv(demo_path)
    df["y"] = df["y"].astype(float)
    print("[train_forecast] Mode DEMO charge: " + str(len(df)) + " mois")
    return df


def apply_smoothing(df, window=3):
    df = df.copy()
    y_raw = df["y"].copy()
    df["y"] = df["y"].rolling(window=window, min_periods=1, center=False).mean().round(1)

    print("[smoothing] window=" + str(window) + " — extrait:")
    for i in range(min(5, len(df))):
        print("  " + str(df["ds"].iloc[i]) + " : " + str(int(y_raw.iloc[i])) + " -> " + str(df["y"].iloc[i]))
    if len(df) > 5:
        print("  ... (" + str(len(df)) + " lignes total)")

    return df


def exclude_incomplete_month(df, df_raw):
    aujourd_hui = pd.Timestamp.now().normalize()
    dernier_mois = pd.to_datetime(df["ds"].iloc[-1])

    if dernier_mois > aujourd_hui:
        print("[train_forecast] Exclusion du dernier mois (" + str(df["ds"].iloc[-1]) + ") — mois dans le futur")
        df = df.iloc[:-1].reset_index(drop=True)
        df_raw = df_raw.iloc[:-1].reset_index(drop=True)
    else:
        jours_ecoules = (aujourd_hui - dernier_mois).days
        if jours_ecoules < 20:
            print("[train_forecast] Exclusion du dernier mois (" + str(df["ds"].iloc[-1]) + ") — " + str(jours_ecoules) + " jours ecoules (incomplet)")
            df = df.iloc[:-1].reset_index(drop=True)
            df_raw = df_raw.iloc[:-1].reset_index(drop=True)

    return df, df_raw


def print_metrics(name, y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    print("=== " + name + " ===")
    print("MAE:  " + str(round(mae, 4)))
    print("RMSE: " + str(round(rmse, 4)))
    print("R2:   " + str(round(r2, 4)))
    return {"mae": mae, "rmse": rmse, "r2": r2}


def eval_linear(train_df, test_df):
    train = train_df.copy()
    train["t"] = range(len(train))
    test = test_df.copy()
    test["t"] = range(len(train), len(train) + len(test))

    model = LinearRegression()
    model.fit(train[["t"]], train["y"])
    y_pred = model.predict(test[["t"]])
    return print_metrics("LinearTrend (test)", test["y"].values, y_pred)


def eval_prophet(train_df, test_df):
    try:
        from prophet import Prophet
    except ImportError:
        print("[train_forecast] Prophet non installe")
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
    return print_metrics("Prophet (test)", test_df["y"].values, y_pred)


def fit_linear_production(df):
    data = df.copy()
    data["t"] = range(len(data))
    model = LinearRegression()
    model.fit(data[["t"]], data["y"])
    return model


def fit_prophet_production(df):
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
    # 1. Chargement
    if USE_DEMO:
        df_raw = load_demo_data()
    elif USE_DB and load_inscriptions_data is not None:
        df_raw = load_inscriptions_data()
    else:
        df_raw = generate_data()

    df_raw["y"] = df_raw["y"].astype(float)

    print("")
    print("[train_forecast] Donnees brutes : " + str(len(df_raw)) + " mois")
    print("  -> y moyen=" + str(round(df_raw["y"].mean(), 1)) + " | std=" + str(round(df_raw["y"].std(), 1)) + " | min=" + str(int(df_raw["y"].min())) + " | max=" + str(int(df_raw["y"].max())))

    # 2. Smoothing
    df = apply_smoothing(df_raw, window=3)
    print("")
    print("[train_forecast] Apres smoothing : y moyen=" + str(round(df["y"].mean(), 1)) + " | std=" + str(round(df["y"].std(), 1)))

    # 3. Exclusion mois incomplet
    df, df_raw = exclude_incomplete_month(df, df_raw)

    # 4. Split 80/20
    split_index = int(len(df) * 0.8)
    train_df = df.iloc[:split_index].reset_index(drop=True)
    test_df = df.iloc[split_index:].reset_index(drop=True)

    print("")
    print("[train_forecast] Split : " + str(len(train_df)) + " train / " + str(len(test_df)) + " test")

    # 5. Evaluation
    metrics_linear = eval_linear(train_df, test_df)
    mae_linear = metrics_linear["mae"]

    metrics_prophet = eval_prophet(train_df, test_df)

    # 6. Choix
    if metrics_prophet is not None and metrics_prophet["mae"] <= mae_linear:
        model_name = "Prophet"
        test_metrics = metrics_prophet
        production_model = fit_prophet_production(df)
        print("")
        print("[train_forecast] Retenu : Prophet (MAE=" + str(round(metrics_prophet["mae"], 2)) + ")")
    else:
        model_name = "LinearTrend"
        test_metrics = metrics_linear
        production_model = fit_linear_production(df)
        if metrics_prophet is None:
            reason = "Prophet indisponible"
        else:
            reason = "MAE LinearTrend=" + str(round(mae_linear, 2)) + " <= Prophet=" + str(round(metrics_prophet["mae"], 2))
        print("")
        print("[train_forecast] Retenu : LinearTrend (" + reason + ")")

    # Fallback
    linear_fallback = fit_linear_production(df)

    # 7. Sauvegarde
    mode_str = "DEMO" if USE_DEMO else ("DB" if USE_DB else "STATIC")
    payload = {
        "model": production_model,
        "model_name": model_name,
        "linear_fallback": linear_fallback,
        "last_data": df,
        "last_data_raw": df_raw,
        "test_metrics": test_metrics,
        "smoothing_window": 3,
        "mode": mode_str,
    }
    joblib.dump(payload, MODELS_DIR / "forecast_model.pkl")

    print("")
    print("[train_forecast] OK -> models/forecast_model.pkl")
    print("  (principal=" + model_name + ", fallback=LinearTrend, " + str(len(df)) + " mois, smoothing=3, mode=" + mode_str + ")")


if __name__ == "__main__":
    train()