# schemas/ca_schema.py
from typing import Literal
from typing import Optional, List  # ← AJOUTER CETTE LIGNE
from pydantic import BaseModel, Field
from schemas.filters import CommonFilters

class CommonFilters(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    formation_id: Optional[int] = None
    formateur_id: Optional[int] = None
    session_type: Optional[str] = None


class CAFilter(CommonFilters):
    periode: Literal[1, 3, 6] = 3


class CAHistoriquePoint(BaseModel):
    mois: str                # "2024-01"
    annee: int
    mois_num: int
    ca: float
    marge: float
    nb_sessions: int
    total_inscrits: int


class CAHistoriqueResponse(BaseModel):
    historique: List[CAHistoriquePoint]
    total_mois: int
    ca_moyen: float
    filtres: CommonFilters


class CAMoisPrevu(BaseModel):
    mois: str
    ca_predit: float
    marge_estimee: float


class CAPredictResponse(BaseModel):
    previsions: List[CAMoisPrevu]
    periode: int
    unite: str = "DT"
    model_used: str
    tendance: str