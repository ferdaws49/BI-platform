from fastapi import APIRouter, HTTPException
from schemas.deficit_schema import SessionDeficitRequest, SessionDeficitResponse
from services.deficit_service import session_deficit_registry

router = APIRouter(tags=["Sessions Déficitaires"])


@router.post("/predict-sessions-deficit", response_model=SessionDeficitResponse)
def predict_sessions_deficit(req: SessionDeficitRequest):
    if not req.sessions:
        raise HTTPException(status_code=400, detail="Liste de sessions vide")

    results         = session_deficit_registry.predict(req.sessions)
    nb_deficitaires = sum(1 for r in results if r.est_deficitaire)
    deficit_total   = sum(r.deficit_estime for r in results)

    return SessionDeficitResponse(
        results    = results,
        model_used = session_deficit_registry.model_name,
        resume     = {
            "total_sessions":        len(results),
            "sessions_deficitaires": nb_deficitaires,
            "sessions_rentables":    len(results) - nb_deficitaires,
            "deficit_total_estime":  f"{deficit_total:.2f} DT",
        },
    )