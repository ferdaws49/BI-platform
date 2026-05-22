"""
Script d'entraînement — Modèle risque d'abandon
Lancer : python -m training.train_risk

Génère : models/risk_model.pkl
"""

import numpy as np
import joblib
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
import warnings

warnings.filterwarnings("ignore")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

# ─── Data ─────────────────────────────────────────────────────────────────────

# Quand la DB est prête — remplacer generate_data() par:
# from data.postgres_loader import load_risk_data
# def generate_data():
#     df = load_risk_data()
#     assert len(df) >= 50, "Pas assez d'apprenants historiques (minimum 50)"
#     X = df[FEATURES].values
#     y = df["abandon"].values
#     return X, y

FEATURES = [
    "taux_presence",
    "absences_consecutives",
    "moyenne_notes",
    "tendance_notes",
    "moyenne_satisfaction",
    "jours_retard_paiement",
]

def generate_data():
    np.random.seed(42)
    n = 300

    # Apprenants à risque (label=1) — ~35% de la population
    n_risk = int(n * 0.35)
    X_risk = np.column_stack([
        np.random.uniform(0.2, 0.65, n_risk),
        np.random.randint(2, 8, n_risk),
        np.random.uniform(3.0, 9.5, n_risk),
        np.random.uniform(-6.0, -1.0, n_risk),
        np.random.uniform(1.0, 2.8, n_risk),
        np.random.randint(20, 90, n_risk),
    ])

    # Apprenants stables (label=0)
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


# ─── Train ────────────────────────────────────────────────────────────────────

def train():
    X, y = generate_data()
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    candidates = {
        "LogisticRegression": LogisticRegression(
            max_iter=1000, C=1.0, random_state=42
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=100, max_depth=6, random_state=42
        ),
    }

    best_score, best_name, best_model = -1, "", None
    for name, clf in candidates.items():
        score = cross_val_score(clf, X_scaled, y, cv=5, scoring="roc_auc").mean()
        print(f"[train_risk] {name}: AUC = {score:.3f}")
        if score > best_score:
            best_score, best_name, best_model = score, name, clf

    best_model.fit(X_scaled, y)

    joblib.dump(
        {
            "model":      best_model,
            "scaler":     scaler,
            "model_name": best_name,
            "features":   FEATURES,
        },
        MODELS_DIR / "risk_model.pkl",
    )
    print(f"[train_risk] ✅ {best_name} sauvegardé dans models/risk_model.pkl (AUC={best_score:.3f})")


if __name__ == "__main__":
    train()