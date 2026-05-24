from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal


# ─────────────────────────────────────────────────────────────────────────────
# INPUT SCHEMAS (received from NestJS)
# ─────────────────────────────────────────────────────────────────────────────

class RawSessionInput(BaseModel):
    """
    Raw session data as sent by NestJS.
    No feature engineering applied yet — that happens in ML service.
    """
    session_id: str
    nb_inscrits: float = Field(ge=0, default=0)
    capacite: float = Field(gt=0)
    revenu: float = Field(ge=0, default=0)
    cout_formateur: float = Field(ge=0, default=0)
    cout_logistique: float = Field(ge=0, default=0)
    impayes: float = Field(ge=0, default=0)
    date: str  # ISO date string: "YYYY-MM-DD"

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
