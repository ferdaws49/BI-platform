"""
deficit_route.py
─────────────────────────────────────────────────────────────────────────────
FastAPI router for Session Deficit Prediction endpoints.

Endpoints:
  POST /predict  — predict risk for a batch of sessions
  POST /train    — retrain the model on new data
  GET  /health   — health check + model status
  GET  /model-info — current model metadata
─────────────────────────────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────────────────────────────
# POST /deficit/predict
# ─────────────────────────────────────────────────────────────────────────────
#FastAPI reçoit et valide
#yemchi ychouf deficit_schema
#Si validation OK : le routeur appelle predict_sessions(). elli mawjouda fi deficit_service.py.
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sessions list cannot be empty",
        )

    if not model_exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No trained model found. Call POST /deficit/train first.",
        )

    try:
        model, scaler = load_model()
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )

    try:
        predictions = predict_sessions(request.sessions, model, scaler)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}",
        )

    logger.info(f"Predicted {len(predictions)} sessions successfully")
    return PredictResponse(predictions=predictions)


# ─────────────────────────────────────────────────────────────────────────────
# POST /deficit/train
# ─────────────────────────────────────────────────────────────────────────────

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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sessions list cannot be empty",
        )

    if len(request.sessions) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough sessions: got {len(request.sessions)}, minimum is 10.",
        )

    try:
        result = run_training(request.sessions, min_samples=10)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training error: {str(e)}",
        )

    return result


# ─────────────────────────────────────────────────────────────────────────────
# GET /deficit/health
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/health",
    summary="Health check",
    description="Returns service status and whether a trained model is available.",
)
async def health() -> dict:
    return {
        "status": "ok",
        "model_ready": model_exists(),
        "timestamp": datetime.utcnow().isoformat(),
        "service": "session-deficit-ml",
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /deficit/model-info
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/model-info",
    summary="Current model metadata",
    description="Returns information about the currently loaded model.",
)
async def model_info() -> dict:
    if not model_exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No trained model found. Call POST /deficit/train first.",
        )

    try:
        model, _ = load_model()
        from services.deficit_service import MODEL_PATH, FEATURE_COLUMNS
        import os

        model_stat = os.stat(MODEL_PATH)
        trained_at = datetime.fromtimestamp(model_stat.st_mtime).isoformat()

        return {
            "model_type": type(model).__name__,
            "solver": model.solver,
            "max_iter": model.max_iter,
            "class_weight": model.class_weight,
            "features": FEATURE_COLUMNS,
            "n_features": len(FEATURE_COLUMNS),
            "model_path": str(MODEL_PATH),
            "trained_at": trained_at,
            "model_size_bytes": model_stat.st_size,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
