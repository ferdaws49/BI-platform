"""
api/deficit_routes.py - Endpoint pour predire les sessions deficitaires

Route : POST /predict-sessions-deficit
Entree : SessionDeficitRequest (liste de SessionFeatures)
Sortie : SessionDeficitResponse (resultats par session + resume)

Endpoints:
  POST /predict    - predict risk for a batch of sessions
  POST /train      - retrain the model on new data
  GET  /health     - health check + model status
  GET  /model-info - current model metadata
"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from schemas.deficit_schema import (
    PredictRequest,
    PredictResponse,
    TrainRequest,
    TrainResponse,
)
from services.deficit_service import (
    load_model,
    model_exists,
    predict_sessions,
    run_training,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deficit", tags=["Session Deficit Prediction"])


# -----------------------------------------------------------------------------
# POST /deficit/predict
# FastAPI recoit et valide -> deficit_schema
# Si validation OK : le routeur appelle predict_sessions() dans deficit_service
# -----------------------------------------------------------------------------
@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict deficit risk for a batch of sessions",
    description="""
Receives raw session data from NestJS, applies feature engineering,
and returns deficit risk predictions for each session.
Requires a trained model. Call /train first if no model exists.
    """,
)
async def predict(request: PredictRequest) -> PredictResponse:
    if not request.sessions:
        raise HTTPException(status_code=400, detail="sessions list cannot be empty")
    if not model_exists():
        raise HTTPException(status_code=503, detail="No trained model found. Call POST /deficit/train first.")
    try:
        model, scaler = load_model()
        predictions = predict_sessions(request.sessions, model, scaler)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    logger.info(f"Predicted {len(predictions)} sessions successfully")
    return PredictResponse(predictions=predictions)


# -----------------------------------------------------------------------------
# POST /deficit/train
# Pipeline complet : cleaning -> features -> labels -> split -> train -> eval
# -----------------------------------------------------------------------------
@router.post(
    "/train",
    response_model=TrainResponse,
    summary="Train the deficit prediction model",
    description="""
Accepts raw session data from NestJS, runs the full ML pipeline:
  1. Data cleaning
  2. Feature engineering
  3. Label creation (is_deficit = marge < 0)
  4. Train/test split (80/20)
  5. Logistic Regression training
  6. Evaluation (accuracy, ROC-AUC, confusion matrix)
  7. Model saved to disk as session_deficit_model.pkl

Minimum 10 sessions required.
    """,
)
async def train(request: TrainRequest) -> TrainResponse:
    if not request.sessions:
        raise HTTPException(status_code=400, detail="sessions list cannot be empty")
    if len(request.sessions) < 10:
        raise HTTPException(status_code=400, detail=f"Not enough sessions: {len(request.sessions)}, minimum is 10.")
    try:
        result = run_training(request.sessions, min_samples=10)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    return result


# -----------------------------------------------------------------------------
# GET /deficit/health
# -----------------------------------------------------------------------------
@router.get("/health", summary="Health check")
async def health() -> dict:
    return {
        "status": "ok",
        "model_ready": model_exists(),
        "timestamp": datetime.utcnow().isoformat(),
        "service": "session-deficit-ml",
    }


# -----------------------------------------------------------------------------
# GET /deficit/model-info
# -----------------------------------------------------------------------------
@router.get("/model-info", summary="Current model metadata")
async def model_info() -> dict:
    if not model_exists():
        raise HTTPException(status_code=404, detail="No trained model found.")
    try:
        model, _ = load_model()
        from services.deficit_service import MODEL_PATH, FEATURE_COLUMNS
        import os
        model_stat = os.stat(MODEL_PATH)
        return {
            "model_type": type(model).__name__,
            "features": FEATURE_COLUMNS,
            "n_features": len(FEATURE_COLUMNS),
            "trained_at": datetime.fromtimestamp(model_stat.st_mtime).isoformat(),
            "model_size_bytes": model_stat.st_size,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))