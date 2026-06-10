from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import date


class SessionFilter(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    formation_id: Optional[int] = None
    formateur_id: Optional[int] = None
    session_type: Optional[Literal["présentiel", "en_ligne"]] = None


class RawSessionInput(BaseModel):
    session_id: str
    session_name: Optional[str] = None
    type_session: Optional[str] = None  # Ajout de Optional et d'une valeur par défaut
    prix_session: float = 0.0 
    #type_session: Literal["présentiel", "en_ligne"]
    #prix_session: float = Field(ge=0)
    capacite: int = Field(gt=0)
    date: str
    formation_id: Optional[int] = None
    formation_name: Optional[str] = None 
    categorie: Optional[str] = None
    formateur_id: Optional[int] = None
    nb_inscrits: float = 0
    # Données post-session (pour le label uniquement)
    revenu: float = 0
    cout_formateur: float = 0
    cout_logistique: float = 0
    impayes: float = 0


class SessionRiskOutput(BaseModel):
    session_id: str
    session_name: str         # Ajouté
    formation_name: str       # Ajouté
    risk_score: float
    risk_level: Literal["low", "medium", "high"]
    is_deficit: int
    estimated_loss: float
    fill_rate: float          # Ajouté (C'est lui qui causait l'erreur 500)
    recommendation: str


class PredictResponse(BaseModel):
    predictions: List[SessionRiskOutput]


class TrainMetrics(BaseModel):
    accuracy: float
    roc_auc: float
    precision: float
    recall: float
    f1_score: float
    n_samples_train: int
    n_samples_test: int


class TrainResponse(BaseModel):
    message: str
    metrics: TrainMetrics