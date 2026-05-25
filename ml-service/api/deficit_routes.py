# deficit_route.py (modifié)
from fastapi import APIRouter, HTTPException, status
from schemas.deficit_schema import PredictResponse, TrainResponse, SessionFilter
from services.deficit_service import load_model, model_exists, predict_sessions, run_training
from data.postgres_loader_sessions import load_sessions_data

router = APIRouter(prefix="/deficit", tags=["Session Deficit Prediction"])


@router.post("/predict", response_model=PredictResponse)
async def predict(filters: SessionFilter):
    """Prédiction : ML Service pull les sessions filtrées depuis la base."""
    if not model_exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No trained model found. Call POST /deficit/train first.",
        )

    # 1. PULL depuis la base avec les filtres
    df = load_sessions_data(filters)
    if df.empty:
        raise HTTPException(400, "No sessions found for these filters.")

    # 2. Convertir en format interne
    from schemas.deficit_schema import RawSessionInput
    raw_sessions = [RawSessionInput(**row) for row in df.to_dict('records')]

    # 3. Prédire
    model, scaler = load_model()
    predictions = predict_sessions(raw_sessions, model, scaler)
    if not predictions:
        raise HTTPException(
            status_code=400,
            detail="No valid sessions remaining after data cleaning."
        )

    return PredictResponse(predictions=predictions)


@router.post("/train", response_model=TrainResponse)
async def train(filters: SessionFilter):
    """Entraînement : ML Service pull les sessions filtrées depuis la base."""
    df = load_sessions_data(filters)
    if df.empty:
        raise HTTPException(400, "No sessions found for these filters.")

    from schemas.deficit_schema import RawSessionInput
    raw_sessions = [RawSessionInput(**row) for row in df.to_dict('records')]

    if len(raw_sessions) < 10:
        raise HTTPException(400, f"Only {len(raw_sessions)} sessions, minimum 10.")

    result = run_training(raw_sessions, min_samples=10)
    return result