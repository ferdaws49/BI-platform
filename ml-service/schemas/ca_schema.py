from pydantic import BaseModel
from typing import List

class CAMoisPrevu(BaseModel):
    mois:          str
    ca_predit:     float
    marge_estimee: float

class CAForecastResponse(BaseModel):
    previsions:  List[CAMoisPrevu]
    unite:       str = "DT"
    model_used:  str
    tendance:    str


class HistoriqueItem(BaseModel):
    mois: str
    annee: int
    trimestre: int
    ca_mensuel: float
    total_cout_formateur: float = 0
    total_cout_logistique: float = 0
    nb_sessions: int = 0
    total_inscrits: int = 0
    total_impaye: float = 0
    
class PredictInput(BaseModel):
    historique: List[HistoriqueItem]
    periode: int


