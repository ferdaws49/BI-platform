"""
Plateforme BI — Centre de Formation Privé
Risk Prediction Microservice — FastAPI + scikit-learn
Port: 8000

Architecture du fichier :
  1. Schémas Pydantic  — contrat JSON entrée/sortie des API
  2. ModelRegistry     — entraînement ML au démarrage + prédiction risque d'abandon
  3. POST /predict     — score de risque par apprenant (0-100)
  4. POST /forecast    — prévision d'inscriptions (Prophet ou régression linéaire)
"""


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from api.ca_routes import router as ca_router
from api.deficit_routes import router as deficit_router
from api.predict_routes import router as predict_router
from api.forecast_routes import router as forecast_router
from models.registry import registry

app = FastAPI(title="BI Risk Prediction Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(ca_router)
app.include_router(deficit_router)
app.include_router(predict_router)
app.include_router(forecast_router)

# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Sonde pour orchestration / load balancer."""
    return {"status": "ok", "model": registry.model_name}