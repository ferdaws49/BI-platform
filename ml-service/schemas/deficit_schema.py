from pydantic import BaseModel
from typing import List

class SessionFeatures(BaseModel):
    session_id:           int
    nb_inscrits:          int
    cout_formateur:       float
    cout_logistique:      float
    montant_inscriptions: float
    duree_jours:          int
    mois:                 int

class SessionDeficitRequest(BaseModel):
    sessions: List[SessionFeatures]

class SessionDeficitResult(BaseModel):
    session_id:      int
    est_deficitaire: bool
    probabilite:     float
    score_risque:    int
    niveau_risque:   str
    deficit_estime:  float
    raison:          str
    recommandation:  str

class SessionDeficitResponse(BaseModel):
    results:    List[SessionDeficitResult]
    resume:     dict
    model_used: str