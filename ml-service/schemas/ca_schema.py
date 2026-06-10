from typing import List, Optional, Literal
from pydantic import BaseModel


class PredictionRequest(BaseModel):
    horizon: int  # Obligatoire : 1 ou 3
    sk_formateur: Optional[int] = None
    sk_formation: Optional[int] = None
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None


class CommonFilters(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    formation_id: Optional[int] = None
    formateur_id: Optional[int] = None
    session_type: Optional[str] = None
