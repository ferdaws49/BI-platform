from typing import List, Optional, Literal
from pydantic import BaseModel

class CommonFilters(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    formation_id: Optional[int] = None
    formateur_id: Optional[int] = None
    session_type: Optional[str] = None

class CAFilter(CommonFilters):
    periode: int = 1

class CAHistoriquePoint(BaseModel):
    mois: str
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
    filtres: CAFilter

class CAMoisPrevu(BaseModel):
    mois: str
    ca_predit: float
    marge_estimee: float
    nb_sessions: int
    source: str

class CAPredictResponse(BaseModel):
    previsions: List[CAMoisPrevu]
    periode: int
    ca_total: Optional[float] = None
    marge_total: Optional[float] = None
    tendance: str