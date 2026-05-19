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