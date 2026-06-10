# ml-service/api/ca_routes.py
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from services.ca_service import get_historique, predict_ca

router = APIRouter(prefix="/ca", tags=["ca"])

class CAPredictRequest(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    formation_id: Optional[int] = None
    formateur_id: Optional[int] = None
    session_type: Optional[str] = None
    periode: int = 3  # ← Accepte 'periode' (envoyé par NestJS)

# ─── GET /ca/historique ──────────────────────────────────────
@router.get("/historique")
def get_ca_historique(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    formation_id: Optional[int] = Query(None),
    formateur_id: Optional[int] = Query(None),
    session_type: Optional[str] = Query(None),
):
    points = get_historique(
        date_from=date_from,
        date_to=date_to,
        formation_id=formation_id,
        formateur_id=formateur_id,
        session_type=session_type,
    )
    return {"points": points}

# ─── POST /ca/predict ────────────────────────────────────────
@router.post("/predict")
def post_ca_predict(request: CAPredictRequest):
    points = predict_ca(
        date_from=request.date_from,
        date_to=request.date_to,
        formation_id=request.formation_id,
        formateur_id=request.formateur_id,
        session_type=request.session_type,
        horizon=request.periode,  # ← Mappe 'periode' → 'horizon'
    )
    return {"points": points}