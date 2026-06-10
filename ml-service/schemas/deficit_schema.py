from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from schemas.ca_schema import CommonFilters

class SessionFilter(CommonFilters):
    pass

class RawSessionInput(BaseModel):
    session_id: str
    nb_inscrits: float = 0
    capacite: float = Field(gt=0)
    revenu: float = 0
    cout_formateur: float = 0
    cout_logistique: float = 0
    impayes: float = 0
    date: str

class SessionRiskOutput(BaseModel):
    session_id: str
    risk_score: float
    risk_level: Literal["low", "medium", "high"]
    is_deficit: int
    estimated_loss: float
    recommendation: str

class PredictResponse(BaseModel):
    predictions: List[SessionRiskOutput]

class TrainMetrics(BaseModel):
    accuracy: float
    roc_auc: float
    n_samples_train: int

class TrainResponse(BaseModel):
    message: str
    metrics: TrainMetrics