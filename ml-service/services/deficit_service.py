"""
services/deficit_service.py — Registry and prediction helper for session deficit model

Rôle : charge `models/deficit_model.pkl` et expose une interface `predict(sessions)`
qui reçoit des objets Pydantic `SessionFeatures` et renvoie `SessionDeficitResult`.
Liens : `training/train_deficit.py`, `schemas/deficit_schema.py`, `api/deficit_routes.py`.
"""

import numpy as np
import joblib
from pathlib import Path
from typing import List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from schemas.deficit_schema import (
    RawSessionInput,
    SessionRiskOutput,
    TrainMetrics,
    TrainResponse,
)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

logger = logging.getLogger(__name__)

MODEL_DIR = Path(os.getenv("MODEL_DIR", "./models"))
MODEL_PATH = MODEL_DIR / "session_deficit_model.pkl"
SCALER_PATH = MODEL_DIR / "session_deficit_scaler.pkl"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLUMNS = [
    "fill_rate",
    "cout_total",
    "marge",
    "taux_impaye",
    "month",
    "revenu",
    "nb_inscrits",
]

# Risk thresholds
RISK_HIGH_THRESHOLD   = 0.8
RISK_MEDIUM_THRESHOLD = 0.5


class SessionDeficitRegistry:
    def __init__(self):
        self.model      = None
        self.scaler     = None
        self.imputer    = None
        self.model_name = ""
        self._load()

    def _load(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "❌ models/deficit_model.pkl introuvable. "
                "Lance d'abord : python -m training.train_deficit"
            )
        bundle          = joblib.load(MODEL_PATH)
        self.model      = bundle["model"]
        self.scaler     = bundle["scaler"]
        self.imputer    = bundle.get("imputer")
        self.model_name = bundle["model_name"]
        print(f"[SessionDeficitRegistry] ✅ Modèle chargé : {self.model_name}")

    records = [s.dict() for s in raw_sessions]
    df = pd.DataFrame(records)

    logger.info(f"[CLEAN] Raw input: {len(df)} sessions")

        X = np.array(feature_matrix)
        if self.imputer is not None:
            X = self.imputer.transform(X)
        probabilities = self.model.predict_proba(
            self.scaler.transform(X)
        )[:, 1]

    # Ensure numeric types
    numeric_cols = ["nb_inscrits", "capacite", "revenu",
                    "cout_formateur", "cout_logistique", "impayes"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Remove sessions with zero or negative capacity (can't compute fill_rate)
    df = df[df["capacite"] > 0].copy()

    # Remove sessions with all-zero financials (no data)
    df = df[
        (df["revenu"] > 0) |
        (df["cout_formateur"] > 0) |  # Au moins 1 chiffre
        (df["cout_logistique"] > 0)
    ].copy()

    logger.info(f"[CLEAN] After cleaning: {len(df)} sessions")

    if len(df) == 0:
        raise ValueError("All sessions were removed during cleaning. Check data quality.")

    return df.reset_index(drop=True)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────

#C'est ici que les vraies variables intelligentes sont créées :
#Ces features sont calculées exactement de la même manière pendant l'entraînement et la prédiction. Sinon le modèle ne comprend rien.
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute all ML features from cleaned raw data.
    This is the ONLY place where features are created.
    """
    df = df.copy()

    # fill_rate: occupancy ratio
    df["fill_rate"] = (df["nb_inscrits"] / df["capacite"]).clip(0, 1)

    # cout_total: total cost
    df["cout_total"] = df["cout_formateur"] + df["cout_logistique"]

    # marge: net margin
    df["marge"] = df["revenu"] - df["cout_total"]

    # taux_impaye: unpaid ratio relative to revenue
    # If revenu = 0, taux_impaye = 1 (worst case)
    df["taux_impaye"] = np.where(
        df["revenu"] > 0,
        (df["impayes"] / df["revenu"]).clip(0, 1),
        1.0
    )

    # month: seasonality feature
    df["month"] = df["date"].apply(_extract_month)

    logger.info(
        f"[FEATURES] Engineered {len(FEATURE_COLUMNS)} features for {len(df)} sessions. "
        f"Avg fill_rate={df['fill_rate'].mean():.2f}, "
        f"Avg marge={df['marge'].mean():.2f}, "
        f"Deficit rate={((df['marge'] < 0).sum() / len(df)):.2%}"
    )

    return df


def _extract_month(date_val) -> int:
    """Extract month integer from ISO string or date object."""
    if isinstance(date_val, (datetime, date)):
        return date_val.month
    try:
        return datetime.fromisoformat(str(date_val)).month
    except Exception:
        return 1  # Default to January if unparseable


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — LABEL CREATION
# ─────────────────────────────────────────────────────────────────────────────

def create_labels(df: pd.DataFrame) -> pd.DataFrame:
    """
    y = 1 if session is DEFICIT (marge < 0) else 0.
    """
    df = df.copy()
    df["is_deficit"] = (df["marge"] < 0).astype(int)

    n_deficit = df["is_deficit"].sum()
    logger.info(
        f"[LABELS] {n_deficit}/{len(df)} sessions labeled as DEFICIT "
        f"({n_deficit/len(df):.1%})"
    )

    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 + 5 — TRAIN/TEST SPLIT + MODEL TRAINING
# ─────────────────────────────────────────────────────────────────────────────

def train_model(df: pd.DataFrame) -> Tuple[LogisticRegression, StandardScaler, TrainMetrics]:
    """
    Full training pipeline:
      - Feature matrix preparation
      - Train/test split (80/20)
      - StandardScaler normalization
      - Logistic Regression training
      - Evaluation
      - Returns trained model, scaler, and metrics
    """
    X = df[FEATURE_COLUMNS].values
    y = df["is_deficit"].values

    if len(np.unique(y)) < 2:
        raise ValueError(
            "Cannot train: only one class present in labels. "
            "Need both DEFICIT and NON-DEFICIT sessions."
        )

    class_counts = np.bincount(y)
    if len(class_counts) < 2 or np.any(class_counts < 2):
        raise ValueError(
            "Cannot train: each class must have at least 2 samples for stratified split. "
            "Collect more data or reduce the test_size."
        )

    # STEP 4 — Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    logger.info(
        f"[TRAIN] Split: {len(X_train)} train / {len(X_test)} test | "
        f"Deficit in train: {y_train.sum()}"
    )

    # Normalize features (critical for Logistic Regression)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    # STEP 5 — Train Logistic Regression
    model = LogisticRegression(
        random_state=42,
        max_iter=1000,
        class_weight="balanced",  # handles class imbalance
        solver="lbfgs",
    )
    model.fit(X_train_scaled, y_train)

    # STEP 6 — Evaluate
    metrics = _evaluate_model(model, scaler, X_test_scaled, y_test, y_train)

    return model, scaler, metrics


# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — EVALUATION
# ─────────────────────────────────────────────────────────────────────────────

def _evaluate_model(
    model: LogisticRegression,
    scaler: StandardScaler,
    X_test_scaled: np.ndarray,
    y_test: np.ndarray,
    y_train: np.ndarray,
) -> TrainMetrics:
    """
    Evaluate trained model and return structured metrics.

    Precision: of all sessions predicted as DEFICIT, how many really are?
    Recall:    of all real DEFICIT sessions, how many did we detect?
    ROC-AUC:   overall discriminative ability (1.0 = perfect, 0.5 = random)
    """
    y_pred      = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]

    acc       = float(accuracy_score(y_test, y_pred))
    if len(np.unique(y_test)) < 2:
        raise ValueError(
            "Cannot compute ROC-AUC: test set contains only one class. "
            "Ensure enough samples per class before training."
        )
    roc_auc   = float(roc_auc_score(y_test, y_pred_proba))
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall    = float(recall_score(y_test, y_pred, zero_division=0))
    f1        = float(f1_score(y_test, y_pred, zero_division=0))
    cm        = confusion_matrix(y_test, y_pred).tolist()

    logger.info(
        f"[EVAL] accuracy={acc:.3f} | roc_auc={roc_auc:.3f} | "
        f"precision={precision:.3f} | recall={recall:.3f} | f1={f1:.3f}"
    )
    logger.info(f"[EVAL] Confusion Matrix:\n{confusion_matrix(y_test, y_pred)}")
    logger.info(f"[EVAL] Classification Report:\n{classification_report(y_test, y_pred)}")

    return TrainMetrics(
        accuracy=acc,
        roc_auc=roc_auc,
        precision=precision,
        recall=recall,
        f1_score=f1,
        confusion_matrix=cm,
        n_samples_train=len(y_train),
        n_samples_test=len(y_test),
        n_deficit_train=int(y_train.sum()),
    )


# ─────────────────────────────────────────────────────────────────────────────
# STEP 7 — SAVE / LOAD MODEL
# ─────────────────────────────────────────────────────────────────────────────

def save_model(model: LogisticRegression, scaler: StandardScaler) -> None:
    """Persist trained model and scaler to disk using joblib."""
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    logger.info(f"[SAVE] Model saved to {MODEL_PATH}")
    logger.info(f"[SAVE] Scaler saved to {SCALER_PATH}")


def load_model() -> Tuple[LogisticRegression, StandardScaler]:
    """Load trained model and scaler from disk."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"No trained model found at {MODEL_PATH}. "
            "Please call /train first."
        )
    model  = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    logger.info(f"[LOAD] Model loaded from {MODEL_PATH}")
    return model, scaler


def model_exists() -> bool:
    return MODEL_PATH.exists() and SCALER_PATH.exists()



# ─────────────────────────────────────────────────────────────────────────────
# TRAINING PIPELINE (callable from API or CLI)
# ─────────────────────────────────────────────────────────────────────────────

def run_training(
    raw_sessions: list[RawSessionInput],
    min_samples: int = 10,
) -> TrainResponse:
    """
    Full training pipeline callable from API router or CLI script.
    """
    logger.info(f"[PIPELINE] Starting training with {len(raw_sessions)} sessions")

    if len(raw_sessions) < min_samples:
        raise ValueError(
            f"Not enough sessions: got {len(raw_sessions)}, "
            f"minimum required is {min_samples}."
        )

    # Step 1: Clean
    df = clean_sessions(raw_sessions)

    # Step 2: Feature Engineering
    df = engineer_features(df)

    # Step 3: Labels
    df = create_labels(df)

    # Validate class distribution
    n_deficit = df["is_deficit"].sum()
    n_non_deficit = len(df) - n_deficit

    if n_deficit == 0:
        raise ValueError("No DEFICIT sessions found. Cannot train — need at least 1 deficit session.")
    if n_non_deficit == 0:
        raise ValueError("No NON-DEFICIT sessions found. Cannot train — need both classes.")

    logger.info(
        f"[PIPELINE] Class distribution: "
        f"{n_deficit} DEFICIT / {n_non_deficit} NON-DEFICIT"
    )

    # Step 4+5: Train + Evaluate
    model, scaler, metrics = train_model(df)

    # Step 6: Save
    save_model(model, scaler)

    logger.info(
        f"[PIPELINE] Training complete. "
        f"Accuracy={metrics.accuracy:.3f} | ROC-AUC={metrics.roc_auc:.3f}"
    )

    return TrainResponse(
        message=(
            f"Model trained successfully on {metrics.n_samples_train + metrics.n_samples_test} sessions. "
            f"Accuracy: {metrics.accuracy:.1%} | ROC-AUC: {metrics.roc_auc:.3f}"
        ),
        metrics=metrics,
    )


# ─────────────────────────────────────────────────────────────────────────────
# STEP 8 — PREDICTION
# ─────────────────────────────────────────────────────────────────────────────

def predict_sessions(
    raw_sessions: List[RawSessionInput],
    model: LogisticRegression,
    scaler: StandardScaler,
) -> List[SessionRiskOutput]:
    """
    Full prediction pipeline for a list of sessions:
      1. Clean raw input
      2. Feature engineering (same as training)
      3. Predict probability with model.predict_proba()
      4. Classify risk level
      5. Compute estimated loss
      6. Generate recommendation
    """
    df = clean_sessions(raw_sessions)
    if df.empty:
        return {
            "predictions": [],
            "insights": ["No valid sessions remaining after data cleaning."],
            "recommendations": []
        }
    df = engineer_features(df)

    missing = [f for f in FEATURE_COLUMNS if f not in df.columns]
    if missing:
        raise ValueError(f"Missing features after engineering: {missing}")

    X = df[FEATURE_COLUMNS].values
    X_scaled = scaler.transform(X) # Normalisation (moyenne=0, écart-type=1)

    # Probability of being DEFICIT (class 1)
    proba = model.predict_proba(X_scaled)[:, 1]  # Probabilité de déficit

    results: List[SessionRiskOutput] = []

    for i, row in df.iterrows():
        risk_score = float(proba[i])
        risk_level = _classify_risk(risk_score)

        # ── Gestion données manquantes ─────────────────────────────
        has_revenue = row["revenu"] > 0
        has_cost = (row["cout_formateur"] > 0) or (row["cout_logistique"] > 0)
        marge = float(row["marge"])

        if not has_revenue or not has_cost:
            is_deficit = 0
            estimated_loss = 0.0
            recommendation = "Données financières incomplètes — vérifier les coûts et le prix de vente"
        else:
            # Données complètes : is_deficit = vraie marge négative
            is_deficit = 1 if marge < 0 else 0
            estimated_loss = abs(marge) if marge < 0 else 0.0

            if risk_level == "high" and row["fill_rate"] < 0.5:
                recommendation = "Cancel session — high deficit risk and low enrollment"
            elif risk_level == "high":
                recommendation = "Reduce costs urgently — session at high deficit risk"
            elif risk_level == "medium":
                recommendation = "Promote session — increase enrollment to avoid deficit"
            else:
                recommendation = "Keep session — deficit risk is low"

        results.append(SessionRiskOutput(
            session_id=str(row["session_id"]),
            risk_score=round(risk_score, 4),
            risk_level=risk_level,
            is_deficit=is_deficit,
            estimated_loss=round(estimated_loss, 2),
            recommendation=recommendation,
        ))

    logger.info(
        f"[PREDICT] {len(results)} predictions | "
        f"HIGH={sum(1 for r in results if r.risk_level == 'high')} | "
        f"MEDIUM={sum(1 for r in results if r.risk_level == 'medium')} | "
        f"LOW={sum(1 for r in results if r.risk_level == 'low')}"
    )

    return results


# Instance globale
# Instance globale
session_deficit_registry = SessionDeficitRegistry()
