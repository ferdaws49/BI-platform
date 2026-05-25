"""
training/train_risk.py — Entraînement hors ligne du modèle d'abandon

Commande : python -m training.train_risk
Sortie   : models/risk_model.pkl

Pipeline :
  1. Données X, y
  2. Split 80/20 stratifié (train / test)
  3. SimpleImputer (moyenne) + StandardScaler — fit sur train uniquement
  4. LR vs RF entraînés sur train, évalués sur test
  5. Sauvegarde du meilleur modèle (sans ré-entraînement sur 100 %)
"""

import numpy as np
import joblib
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
import warnings

import os
from typing import Optional

USE_DB = os.getenv("USE_DB", "0") in ("1", "true", "True")
try:
    from data.postgres_loader import load_risk_data
except Exception:
    load_risk_data = None

from training.eval_utils import print_classification_metrics

warnings.filterwarnings("ignore")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

FEATURES = [
    "taux_presence",
    "absences_consecutives",
    "moyenne_notes",
    "tendance_notes",
    "moyenne_satisfaction",
    "jours_retard_paiement",
]


def generate_data():
    """Jeu synthétique pour dev : ~35 % de classe positive (abandon)."""
    np.random.seed(42)
    n = 300

    n_risk = int(n * 0.35)
    X_risk = np.column_stack([
        np.random.uniform(0.2, 0.65, n_risk),
        np.random.randint(2, 8, n_risk),
        np.random.uniform(3.0, 9.5, n_risk),
        np.random.uniform(-6.0, -1.0, n_risk),
        np.random.uniform(1.0, 2.8, n_risk),
        np.random.randint(20, 90, n_risk),
    ])

    n_ok = n - n_risk
    X_ok = np.column_stack([
        np.random.uniform(0.70, 1.0, n_ok),
        np.random.randint(0, 2, n_ok),
        np.random.uniform(10.0, 19.5, n_ok),
        np.random.uniform(-1.0, 4.0, n_ok),
        np.random.uniform(3.0, 5.0, n_ok),
        np.random.randint(0, 15, n_ok),
    ])

    X = np.vstack([X_risk, X_ok])
    y = np.array([1] * n_risk + [0] * n_ok)

    idx = np.random.permutation(n)
    return X[idx], y[idx]


def train():
    if USE_DB and load_risk_data is not None:
        df = load_risk_data()
        X = df[FEATURES].values
        y = df["abandon"].values
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

    lr = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
    rf = RandomForestClassifier(
        n_estimators=100, max_depth=6, random_state=42
    )

    lr.fit(X_train_scaled, y_train)
    rf.fit(X_train_scaled, y_train)

    y_pred_lr = lr.predict(X_test_scaled)
    y_proba_lr = lr.predict_proba(X_test_scaled)[:, 1]

    y_pred_rf = rf.predict(X_test_scaled)
    y_proba_rf = rf.predict_proba(X_test_scaled)[:, 1]

    metrics_lr = print_classification_metrics(
        "Logistic Regression", y_test, y_pred_lr, y_proba_lr
    )
    metrics_rf = print_classification_metrics(
        "Random Forest", y_test, y_pred_rf, y_proba_rf
    )

    auc_lr = metrics_lr.get("auc", 0.0)
    auc_rf = metrics_rf.get("auc", 0.0)

    if auc_lr >= auc_rf:
        best_model, best_name = lr, "LogisticRegression"
        best_metrics = metrics_lr
    else:
        best_model, best_name = rf, "RandomForest"
        best_metrics = metrics_rf

    print(f"\n[train_risk] Meilleur modele : {best_name} (AUC test = {best_metrics.get('auc', 0):.4f})")

    joblib.dump(
        {
            "model":      best_model,
            "scaler":     scaler,
            "imputer":    imputer,
            "model_name": best_name,
            "features":   FEATURES,
            "test_metrics": best_metrics,
        },
        MODELS_DIR / "risk_model.pkl",
    )
    print("[train_risk] OK Sauvegarde : models/risk_model.pkl (entraine sur train 80 % uniquement)")


if __name__ == "__main__":
    train()
