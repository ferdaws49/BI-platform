"""
training/train_deficit.py — Sessions déficitaires

Commande : python -m training.train_deficit
Sortie   : models/deficit_model.pkl

Pipeline : split 80/20 stratifié, imputer + scaler (fit train),
           GradientBoosting vs RandomForest, métriques sur test.
"""

import numpy as np
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import train_test_split
import warnings
import os

USE_DB = os.getenv("USE_DB", "0") in ("1", "true", "True")
try:
    from data.postgres_loader import load_sessions_data
except Exception:
    load_sessions_data = None

from training.eval_utils import print_classification_metrics

warnings.filterwarnings("ignore")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def generate_data():
    np.random.seed(99)
    n = 500
    nb_inscrits          = np.random.randint(2, 25, n)
    cout_formateur       = np.random.uniform(500, 3000, n)
    cout_logistique      = np.random.uniform(100, 800, n)
    tarif_moyen          = np.random.uniform(150, 800, n)
    montant_inscriptions = nb_inscrits * tarif_moyen
    duree_jours          = np.random.randint(1, 10, n)
    mois                 = np.random.randint(1, 13, n)
    cout_total           = cout_formateur + cout_logistique
    est_deficitaire      = (cout_total > montant_inscriptions).astype(int)

    X = np.column_stack([
        nb_inscrits, cout_formateur, cout_logistique,
        montant_inscriptions,
        duree_jours, mois,
    ])
    return X, est_deficitaire


def train():
    if USE_DB and load_sessions_data is not None:
        df = load_sessions_data()
        X = df[["nb_inscrits", "cout_formateur", "cout_logistique", "montant_inscriptions", "duree_jours", "mois"]].values
        y = df["est_deficitaire"].values
    else:
        X, y = generate_data()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    imputer = SimpleImputer(strategy="mean")
    X_train = imputer.fit_transform(X_train)
    X_test = imputer.transform(X_test)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    gb = GradientBoostingClassifier(
        n_estimators=150, max_depth=4, learning_rate=0.05, random_state=42
    )
    rf = RandomForestClassifier(
        n_estimators=100, max_depth=5, random_state=42
    )

    gb.fit(X_train_scaled, y_train)
    rf.fit(X_train_scaled, y_train)

    y_pred_gb = gb.predict(X_test_scaled)
    y_proba_gb = gb.predict_proba(X_test_scaled)[:, 1]

    y_pred_rf = rf.predict(X_test_scaled)
    y_proba_rf = rf.predict_proba(X_test_scaled)[:, 1]

    metrics_gb = print_classification_metrics(
        "GradientBoosting", y_test, y_pred_gb, y_proba_gb
    )
    metrics_rf = print_classification_metrics(
        "RandomForest", y_test, y_pred_rf, y_proba_rf
    )

    auc_gb = metrics_gb.get("auc", 0.0)
    auc_rf = metrics_rf.get("auc", 0.0)

    if auc_gb >= auc_rf:
        best_model, best_name = gb, "GradientBoosting"
        best_metrics = metrics_gb
    else:
        best_model, best_name = rf, "RandomForest"
        best_metrics = metrics_rf

    print(f"\n[train_deficit] Meilleur modele : {best_name} (AUC test = {best_metrics.get('auc', 0):.4f})")

    joblib.dump(
        {
            "model":        best_model,
            "scaler":       scaler,
            "imputer":      imputer,
            "model_name":   best_name,
            "test_metrics": best_metrics,
        },
        MODELS_DIR / "deficit_model.pkl",
    )
    print("[train_deficit] OK Sauvegarde : models/deficit_model.pkl")


if __name__ == "__main__":
    train()
