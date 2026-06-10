from fastapi import APIRouter, HTTPException
from datetime import date
from schemas.deficit_schema import PredictResponse, TrainResponse, SessionFilter, RawSessionInput
from services.deficit_service import load_model, model_exists, predict_sessions, run_training
from data.postgres_loader_sessions import load_sessions_data

router = APIRouter(prefix="/deficit", tags=["Session Deficit Prediction"])


def _apply_default_dates(filters: SessionFilter):
    today = date.today()
    if not filters.date_from:
        filters.date_from = date(today.year, 1, 1)
    if not filters.date_to:
        filters.date_to = today
    return filters


@router.post("/train", response_model=TrainResponse)
def train_deficit(filters: SessionFilter):
    filters = _apply_default_dates(filters)
    df = load_sessions_data(filters)

    if df.empty:
        raise HTTPException(400, "Aucune donnée pour ces filtres.")

    raw_sessions = [RawSessionInput(**row) for row in df.to_dict("records")]

    if len(raw_sessions) < 10:
        raise HTTPException(400, f"Données insuffisantes ({len(raw_sessions)} sessions, min 10).")

    try:
        return run_training(raw_sessions)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/predict", response_model=PredictResponse)
def predict_deficit(filters: SessionFilter):
    if not model_exists():
        raise HTTPException(503, "Modèle non entraîné. Appelez /train d'abord.")

    filters = _apply_default_dates(filters)
    df = load_sessions_data(filters)

    if df.empty:
        raise HTTPException(404, "Aucune session trouvée.")

    raw_sessions = [RawSessionInput(**row) for row in df.to_dict("records")]
    model, scaler, threshold = load_model()
    predictions = predict_sessions(raw_sessions, model, scaler, threshold=0.5)

    return PredictResponse(predictions=predictions)