"""
schemas/deficit_schema.py — Schémas Pydantic pour les sessions et déficit

Contient :
    - `SessionFeatures` : features d'une session attendues par l'API
    - `SessionDeficitRequest/Response` : contrat POST /predict-sessions-deficit

Notes : `session_id` est `str` (UUID possible en base).
"""

from pydantic import BaseModel
from typing import List


class SessionFeatures(BaseModel):
    session_id:           str
    nb_inscrits:          int
    cout_formateur:       float
    cout_logistique:      float
    montant_inscriptions: float
    duree_jours:          int
    mois:                 int

# ─────────────────────────────────────────────────────────────────────────────
# INPUT SCHEMAS (received from NestJS)
# ─────────────────────────────────────────────────────────────────────────────

class SessionDeficitResult(BaseModel):
    session_id:      str
    est_deficitaire: bool
    probabilite:     float
    score_risque:    int
    niveau_risque:   str
    deficit_estime:  float
    raison:          str
    recommandation:  str

    @validator("capacite")
    def capacite_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("capacite must be > 0")
        return v


class PredictRequest(BaseModel):
    sessions: List[RawSessionInput]


class TrainRequest(BaseModel):
    sessions: List[RawSessionInput]


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT SCHEMAS (returned to NestJS)
# ─────────────────────────────────────────────────────────────────────────────

class SessionRiskOutput(BaseModel):
    session_id: str
    risk_score: float = Field(ge=0.0, le=1.0)
    risk_level: Literal["low", "medium", "high"]
    is_deficit: Literal[0, 1]
    estimated_loss: float
    recommendation: str


class PredictResponse(BaseModel):
    predictions: List[SessionRiskOutput]


class TrainMetrics(BaseModel):
    accuracy: float
    roc_auc: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: List[List[int]]
    n_samples_train: int
    n_samples_test: int
    n_deficit_train: int


class TrainResponse(BaseModel):
    message: str
    metrics: TrainMetrics


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL (feature-engineered row)
# ─────────────────────────────────────────────────────────────────────────────

class EngineeredFeatures(BaseModel):
    session_id: str
    fill_rate: float
    cout_total: float
    marge: float
    taux_impaye: float
    month: int
    revenu: float
    nb_inscrits: float
    capacite: float
