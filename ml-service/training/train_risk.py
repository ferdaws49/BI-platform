"""
training/train_risk.py — Entraînement hors ligne du modèle d'abandon

Commande : python -m training.train_risk
Sortie   : models/risk_model.pkl

Pipeline :
  1. Données X depuis DB (features réelles) ou synthétiques
  2. Label probabiliste : risk score → proba → binomial(1, proba)
     → évite l'apprentissage trivial des règles métier
  3. Split 80/20 stratifié (train / test)
  4. SimpleImputer (moyenne) + StandardScaler — fit sur train uniquement
  5. LR vs RF entraînés sur train, évalués sur test
  6. Sauvegarde du meilleur modèle (AUC)
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
from dotenv import load_dotenv

load_dotenv()

USE_DB = os.getenv("USE_DB", "0") in ("1", "true", "True")
print("USE_DB =", USE_DB)

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


# ─── Label probabiliste ───────────────────────────────────────────────────────

def build_probabilistic_label(df, seed=42):
    """
    Transforme les features en label probabiliste.

    Etapes :
      1. Risk score (combinaison pondérée des features)
      2. Sigmoid → probabilité d'abandon [0, 1]
      3. Tirage binomial → label 0/1

    Avantage vs rule-based :
      - Même profil peut donner abandon=0 ou abandon=1
      - ML apprend des patterns, pas des règles fixes
    """

    risk = (
        0.45 * (1 - df["taux_presence"]) +
        0.35 * (1 - (df["moyenne_notes"] / 20).clip(0, 1)) +
        0.15 * (df["jours_retard_paiement"] / 90).clip(0, 1) +
        0.05 * (df["absences_consecutives"] / 5).clip(0, 1)
    )

    # Sigmoid (plus forte séparation)
    proba = 1 / (1 + np.exp(-8 * (risk - 0.45)))

    np.random.seed(seed)
    labels = np.random.binomial(1, proba.values)

    taux = labels.mean()
    print(f"[probabilistic_label] Taux abandon : {taux:.1%} "
          f"(risk moyen={risk.mean():.3f})")

    return labels

# ─── Données synthétiques (dev / CI) ─────────────────────────────────────────

def generate_data():
    """Jeu synthétique ~35% de classe positive."""
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


# ─── Pipeline principal ───────────────────────────────────────────────────────

def train():
    if USE_DB and load_risk_data is not None:
        # Données réelles — label probabiliste
        df = load_risk_data()
        X = df[FEATURES].values
        y = build_probabilistic_label(df)
        print(f"[train_risk] Données réelles : {len(y)} apprenants")
    else:
        # Données synthétiques — label déjà intégré
        X, y = generate_data()
        print(f"[train_risk] Données synthétiques : {len(y)} samples")

    print(f"  → Classes : {np.bincount(y.astype(int))}")

    # Split stratifié 80/20
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    # Prétraitement — fit sur train uniquement
    imputer = SimpleImputer(strategy="mean")
    X_train = imputer.fit_transform(X_train)
    X_test  = imputer.transform(X_test)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    # Modèles
    lr = LogisticRegression(
        max_iter=1000,
        C=1.0,
        random_state=42,
        class_weight='balanced',
    )
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=4,
        min_samples_leaf=5,
        min_samples_split=10,
        random_state=42,
        class_weight='balanced',
    )

    lr.fit(X_train_scaled, y_train)
    rf.fit(X_train_scaled, y_train)

    # Evaluation sur test
    metrics_lr = print_classification_metrics(
        "Logistic Regression", y_test,
        lr.predict(X_test_scaled),
        lr.predict_proba(X_test_scaled)[:, 1],
    )
    metrics_rf = print_classification_metrics(
        "Random Forest", y_test,
        rf.predict(X_test_scaled),
        rf.predict_proba(X_test_scaled)[:, 1],
    )

    # Choix du meilleur modèle par AUC
    auc_lr = metrics_lr.get("auc", 0.0)
    auc_rf = metrics_rf.get("auc", 0.0)

    if auc_lr >= auc_rf:
        best_model, best_name = lr, "LogisticRegression"
        best_metrics = metrics_lr
    else:
        best_model, best_name = rf, "RandomForest"
        best_metrics = metrics_rf

    print(f"\n[train_risk] Meilleur modele : {best_name} "
          f"(AUC test = {best_metrics.get('auc', 0):.4f})")

    # Sauvegarde
    joblib.dump(
        {
            "model":        best_model,
            "scaler":       scaler,
            "imputer":      imputer,
            "model_name":   best_name,
            "features":     FEATURES,
            "test_metrics": best_metrics,
        },
        MODELS_DIR / "risk_model.pkl",
    )
    print("[train_risk] OK → models/risk_model.pkl")
    print(df[FEATURES].mean())


if __name__ == "__main__":
    train()