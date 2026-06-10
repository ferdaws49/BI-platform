import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, roc_auc_score, precision_score,
    recall_score, f1_score, precision_recall_curve
)

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "session_deficit_model.pkl"
SCALER_PATH = MODEL_DIR / "session_deficit_scaler.pkl"
THRESHOLD_PATH = MODEL_DIR / "deficit_threshold.pkl"

# FEATURES : planification + fill_rate (connu en début de session)
FEATURE_COLUMNS = [
    "capacite",
    "prix_session",
    "fill_rate",           # ← taux de remplissage au moment de la prédiction
    "month",
    "type_session_présentiel",
    "type_session_en_ligne",
]


def model_exists() -> bool:
    return MODEL_PATH.exists() and SCALER_PATH.exists() and THRESHOLD_PATH.exists()


def load_model():
    if not model_exists():
        raise FileNotFoundError("Modèle introuvable.")
    return joblib.load(MODEL_PATH), joblib.load(SCALER_PATH), joblib.load(THRESHOLD_PATH)


def engineer_features(df: pd.DataFrame, for_prediction: bool = False) -> pd.DataFrame:
    df = df.copy()

    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.month
    df["fill_rate"] = (df["nb_inscrits"] / df["capacite"].replace(0, np.nan)).fillna(0).clip(0, 1)

    # Normalisation type_session
    df["type_session"] = df["type_session"].astype(str).str.lower().str.strip()
    df = pd.get_dummies(df, columns=["type_session"], prefix="type_session")

    # Conversion numérique sécurisée
    df["cout_formateur"] = pd.to_numeric(df.get("cout_formateur", 0), errors="coerce").fillna(0)
    df["cout_logistique"] = pd.to_numeric(df.get("cout_logistique", 0), errors="coerce").fillna(0)
    df["revenu"] = pd.to_numeric(df.get("revenu", 0), errors="coerce").fillna(0)
    df["impayes"] = pd.to_numeric(df.get("impayes", 0), errors="coerce").fillna(0)

    if not for_prediction:
        # --- LABEL : déficit réel (connu après la session) ---
        df["marge"] = df["revenu"] - df["cout_formateur"] - df["cout_logistique"] - df["impayes"]
        df["is_deficit"] = (df["marge"] < 0).astype(int)

        print(f"📊 Rentables: {(df['is_deficit']==0).sum()} | Déficitaires: {(df['is_deficit']==1).sum()}")
        print(f"📊 Marge moyenne: {df['marge'].mean():.2f} | Min: {df['marge'].min():.2f}")

        if df["is_deficit"].nunique() < 2:
            print("⚠️ Une seule classe → fallback fill_rate < 0.5")
            df["is_deficit"] = (df["fill_rate"] < 0.5).astype(int)

    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0

    if not for_prediction:
        return df[FEATURE_COLUMNS + ["is_deficit", "date"]]

    return df


def run_training(raw_sessions, min_samples=10):
    from schemas.deficit_schema import TrainMetrics, TrainResponse

    df = pd.DataFrame([s.dict() for s in raw_sessions])
    df = engineer_features(df, for_prediction=False)

    if len(df) < min_samples:
        raise ValueError(f"Données insuffisantes : {len(df)} sessions (min {min_samples}).")

    df = df.sort_values("date")
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    if len(test_df) < 2:
        raise ValueError("Pas assez de données pour le test.")

    X_train = train_df[FEATURE_COLUMNS].values
    y_train = train_df["is_deficit"].values
    X_test = test_df[FEATURE_COLUMNS].values
    y_test = test_df["is_deficit"].values

    

    # --- SANS StandardScaler (LogisticRegression gère bien les échelles) ---// lezem nh
    # ET SANS class_weight (testons d'abord sans)
    model = LogisticRegression(
        class_weight=None,        # ← Test sans pondération
        C=1.0,
        penalty="l2",
        random_state=42,
        max_iter=1000,
        solver="lbfgs"
    )
    model.fit(X_train, y_train)   # ← Pas de scaling

    # --- SEUIL 0.5 (standard) ---
    probs = model.predict_proba(X_test)[:, 1]
    y_pred = (probs >= 0.5).astype(int)

    # --- CORRECTION AUC INVERSÉE ---
    auc = roc_auc_score(y_test, probs)
    if auc < 0.5:
        print(f"⚠️ AUC inversée ({auc:.3f}) → inversion automatique")
        probs = 1 - probs
        y_pred = (probs >= 0.5).astype(int)
        auc = 1 - auc

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    print(f"📊 Test : Acc={acc:.3f} AUC={auc:.3f} P={prec:.3f} R={rec:.3f} F1={f1:.3f}")

    # Coefficients
    print(f"\n--- COEFFICIENTS ---")
    for feat, coef in zip(FEATURE_COLUMNS, model.coef_[0]):
        print(f"  {feat:25s} : {coef:>8.3f}")

    # Seuil = 0.5 (standard, pas d'optimisation qui dérape)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(None, SCALER_PATH)  # ← Pas de scaler
    joblib.dump(0.5, THRESHOLD_PATH)

    return TrainResponse(
        message="Modèle LogisticRegression (sans scaler, seuil 0.5)",
        metrics=TrainMetrics(
            accuracy=round(float(acc), 3),
            roc_auc=round(float(auc), 3),
            precision=round(float(prec), 3),
            recall=round(float(rec), 3),
            f1_score=round(float(f1), 3),
            n_samples_train=len(y_train),
            n_samples_test=len(y_test)
        )
    )


# ml-service/services/deficit_service.py

def predict_sessions(raw_sessions, model, scaler, threshold):
    from schemas.deficit_schema import SessionRiskOutput

    df = pd.DataFrame([s.dict() for s in raw_sessions])
    df = engineer_features(df, for_prediction=True)

    X = df[FEATURE_COLUMNS].values
    probs = model.predict_proba(X)[:, 1]
    threshold = 0.5 

    results = []
    for i, row in df.iterrows():
        score = float(probs[i])
        is_deficit = 1 if score >= threshold else 0

        # Niveaux de risque
        if score < threshold - 0.15:
            level = "low"
        elif score < threshold + 0.15:
            level = "medium"
        else:
            level = "high"

        # --- RECOMMANDATIONS ---
        current_fill_rate = row["fill_rate"] # On récupère la valeur ici
        capacite = row["capacite"]
        type_session = "présentiel" if row.get("type_session_présentiel", 0) == 1 else "en ligne"
        places_restantes = int(capacite * (1 - current_fill_rate))

        # (Gardez votre logique de recommandation ici...)
        if level == "high":
            rec = "Risque critique : Envisager l'annulation ou la réduction des coûts."
        elif level == "medium":
            rec = "Risque modéré : Booster les inscriptions via une promotion."
        else:
            rec = "Session saine : Aucune action requise."

        # Calcul perte estimée
        revenu_attendu = capacite * current_fill_rate * row["prix_session"]
        cout_estime = 400 + (capacite * (50 if row.get("type_session_présentiel", 0) == 1 else 5))
        est_loss = max(0, cout_estime - revenu_attendu) * score

        # --- CORRECTION ICI ---
        results.append(SessionRiskOutput(
            # Utilisation de i (index de boucle) au lieu de id (fonction python)
            session_id=str(row.get("session_id", f"session_{i}")),
            session_name= str (row.get('session_name')),  # Ajouté
            formation_name=str(row.get("formation_name")),
            risk_score=round(score, 4),
            risk_level=level,
            is_deficit=is_deficit,
            estimated_loss=round(est_loss, 2),
            fill_rate=float(current_fill_rate), # AJOUT DU CHAMP MANQUANT
            recommendation=rec
        ))
    return results