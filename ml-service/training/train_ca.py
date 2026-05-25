"""
training/train_ca.py — Prévision CA mensuel

Commande : python -m training.train_ca
Sortie   : models/ca_model.pkl

Split chronologique 80/20 (pas de shuffle — séries temporelles).
"""

import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingRegressor
import warnings
import os

USE_DB = os.getenv("USE_DB", "0") in ("1", "true", "True")
try:
    from data.postgres_loader import load_ca_data
except Exception:
    load_ca_data = None

from training.eval_utils import print_regression_metrics

warnings.filterwarnings("ignore")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def generate_data():
    df_real = load_ca_data()
    n_real = len(df_real)

    #if n < 15:
    #    raise ValueError(f"❌ Insuffisant : {n} mois réels, minimum 15 requis pour ce modèle.")
    
    #return df

    if n_real == 0:
        raise ValueError("Aucune donnée dans le DW")

    # Compléter si insuffisant pour le feature engineering (besoin de 15+ mois)
    #ki naamel generation lezem nahiha 
    df = completer_historique(df_real, target_months=36)
    return df

#lezemni nthabet  ml features elli rbat bih  ca_lag_1
def build_features(df):
    df = df.sort_values(["annee", "mois"]).reset_index(drop=True)

    #Parce que le CA de ce mois dépend fortement du CA du mois dernier (tendance, inertie commerciale, saisonnalité).
    df["ca_lag_1"]  = df["ca_mensuel"].shift(1)# valeur du mois précédent
    df["ca_lag_2"]  = df["ca_mensuel"].shift(2)
    df["ca_lag_3"]  = df["ca_mensuel"].shift(3)
    df["ca_lag_12"] = df["ca_mensuel"].shift(12)

    df["ca_moy_3m"] = df["ca_mensuel"].shift(1).rolling(3).mean()
    df["ca_moy_6m"] = df["ca_mensuel"].shift(1).rolling(6).mean()

    df["cout_formateur_lag1"]  = df["total_cout_formateur"].shift(1)
    df["cout_logistique_lag1"] = df["total_cout_logistique"].shift(1)
    df["inscrits_lag1"]        = df["total_inscrits"].shift(1)
    df["nb_sessions_lag1"]     = df["nb_sessions"].shift(1)

    df["taux_impaye_lag1"] = (df["total_impaye"] / (df["ca_mensuel"] + 1)).shift(1)
    df["marge_lag1"]  = (
        df["ca_mensuel"].shift(1)
        - df["total_cout_formateur"].shift(1)
        - df["total_cout_logistique"].shift(1)
    )

    df["mois_num"] = df["mois"]
    df["mois_sin"] = np.sin(2 * np.pi * df["mois"] / 12)
    df["mois_cos"] = np.cos(2 * np.pi * df["mois"] / 12)

    return df.dropna()


FEATURES = [
    "ca_lag_1", "ca_lag_2", "ca_lag_3", "ca_lag_12",
    "ca_moy_3m", "ca_moy_6m",
    "cout_formateur_lag1", "cout_logistique_lag1",
    "inscrits_lag1", "nb_sessions_lag1",
    "taux_impaye_lag1", "marge_lag1",
    "mois_num", "trimestre", "mois_sin", "mois_cos",
]


def train():
    if USE_DB and load_ca_data is not None:
        df = build_features(load_ca_data())
    else:
        df = build_features(generate_data())

    X = df[FEATURES].values
    y = df["ca_mensuel"].values

    split_index = int(len(X) * 0.8)
    X_train, X_test = X[:split_index], X[split_index:]
    y_train, y_test = y[:split_index], y[split_index:]

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = GradientBoostingRegressor(
        n_estimators=300, learning_rate=0.03,
        max_depth=4, random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    y_pred_test = model.predict(X_test_scaled)
    test_metrics = print_regression_metrics("GradientBoosting (CA)", y_test, y_pred_test)

    joblib.dump(
        {
            "model":        model,
            "scaler":       scaler,
            "last_data":    df,
            "features":     FEATURES,
            "test_metrics": test_metrics,
        },
        MODELS_DIR / "ca_model.pkl",
    )
    print(
        f"[train_ca] OK Sauvegarde : models/ca_model.pkl "
        f"({split_index} mois train / {len(X) - split_index} mois test)"
    )


if __name__ == "__main__":
    train()
