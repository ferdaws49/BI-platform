from fastapi import APIRouter, HTTPException
from schemas.deficit_schema import PredictResponse, TrainResponse, SessionFilter, RawSessionInput
from services.deficit_service import load_model, model_exists, predict_sessions, run_training
from data.postgres_loader_sessions import load_sessions_data

router = APIRouter(prefix="/deficit", tags=["Session Deficit Prediction"])

@router.post("/train", response_model=TrainResponse)
def train_deficit(filters: SessionFilter):
    """Entraîne le modèle de classification en utilisant les données de la base."""
    df = load_sessions_data(filters)
    
    if df.empty:
        raise HTTPException(400, "La base de données est vide pour ces filtres.")

    # Conversion du DataFrame en liste d'objets Pydantic pour le service
    raw_sessions = [RawSessionInput(**row) for row in df.to_dict('records')]

    if len(raw_sessions) < 5:
        raise HTTPException(400, f"Données insuffisantes ({len(raw_sessions)} sessions, min 5).")

    try:
        result = run_training(raw_sessions)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.post("/predict", response_model=PredictResponse)
def predict_deficit(filters: SessionFilter):
    """Prédit le risque de déficit pour les sessions sélectionnées par l'utilisateur."""
    if not model_exists():
        raise HTTPException(503, "Le modèle n'est pas entraîné. Appelez /train d'abord.")

    # 1. On récupère les sessions à analyser depuis SQL
    df = load_sessions_data(filters)
    if df.empty:
        raise HTTPException(404, "Aucune session trouvée pour ces critères.")

    # 2. Conversion
    raw_sessions = [RawSessionInput(**row) for row in df.to_dict('records')]

    # 3. Chargement du modèle et prédiction
    model, scaler = load_model()
    predictions = predict_sessions(raw_sessions, model, scaler)

    return PredictResponse(predictions=predictions)