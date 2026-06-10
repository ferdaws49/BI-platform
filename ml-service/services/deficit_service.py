import numpy as np
import pandas as pd
import joblib
import os
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score
from typing import List, Tuple

# --- CONFIGURATION DES CHEMINS ---
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "session_deficit_model.pkl"
SCALER_PATH = MODEL_DIR / "session_deficit_scaler.pkl"

# FEATURES PRÉDICTIVES (SANS Data Leakage)
FEATURE_COLUMNS = ["fill_rate", "cout_total", "nb_inscrits", "capacite", "month"]

# --- FONCTIONS DE GESTION DU MODÈLE (Celles qui manquaient) ---
def model_exists() -> bool:
    """Vérifie si le modèle et le scaler existent sur le disque."""
    return MODEL_PATH.exists() and SCALER_PATH.exists()

def load_model() -> Tuple[LogisticRegression, StandardScaler]:
    """Charge le modèle et le scaler depuis le disque."""
    if not model_exists():
        raise FileNotFoundError("Modèle ou Scaler introuvable.")
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    return model, scaler

# --- LOGIQUE ML ---
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Calcul des variables intelligentes
    df["fill_rate"] = (df["nb_inscrits"] / df["capacite"]).clip(0, 1)
    df["cout_total"] = df["cout_formateur"] + df["cout_logistique"]
    df["marge"] = df["revenu"] - df["cout_total"]
    
    # Extraction du mois pour la saisonnalité
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.month
    
    # LABEL : 1 si marge < 100 DT (Seuil de risque)
    if "is_deficit" not in df.columns:
        df["is_deficit"] = (df["marge"] < 100).astype(int)
    
    return df

def run_training(raw_sessions):
    """Pipeline d'entraînement complet."""
    # Conversion de la liste Pydantic en DataFrame
    df = pd.DataFrame([s.dict() for s in raw_sessions])
    df = engineer_features(df)
    
    if df["is_deficit"].nunique() < 2:
        raise ValueError("L'historique doit contenir des sessions rentables ET des sessions à risque.")

    X = df[FEATURE_COLUMNS].values
    y = df["is_deficit"].values

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    
    model = LogisticRegression(class_weight="balanced", random_state=42)
    model.fit(X_train_sc, y_train)
    
    # Evaluation
    X_test_sc = scaler.transform(X_test)
    probs = model.predict_proba(X_test_sc)[:, 1]
    acc = accuracy_score(y_test, model.predict(X_test_sc))
    auc = roc_auc_score(y_test, probs)
    
    # Sauvegarde
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    
    from schemas.deficit_schema import TrainMetrics, TrainResponse
    return TrainResponse(
        message="Modèle de déficit entraîné avec succès",
        metrics=TrainMetrics(
            accuracy=round(acc, 3),
            roc_auc=round(auc, 3),
            n_samples_train=len(y_train)
        )
    )

def predict_sessions(raw_sessions, model, scaler):
    """Pipeline de prédiction."""
    df_raw = pd.DataFrame([s.dict() for s in raw_sessions])
    df = engineer_features(df_raw)
    
    X_sc = scaler.transform(df[FEATURE_COLUMNS].values)
    probs = model.predict_proba(X_sc)[:, 1]
    
    results = []
    for i, row in df.iterrows():
        score = float(probs[i])
        # Classification du risque
        level = "high" if score > 0.8 else "medium" if score > 0.5 else "low"
        
        # Recommandation dynamique
        if level == "high":
            rec = "Risque critique : Envisager l'annulation ou la réduction des coûts."
        elif level == "medium":
            rec = "Risque modéré : Booster les inscriptions via une promotion."
        else:
            rec = "Session saine : Aucune action requise."

        results.append({
            "session_id": str(row["session_id"]),
            "risk_score": round(score, 4),
            "risk_level": level,
            "is_deficit": 1 if score > 0.5 else 0,
            "estimated_loss": round(abs(min(0, row["marge"])), 2),
            "recommendation": rec
        })
    return results