# ca_route.py
from fastapi import APIRouter, HTTPException
from schemas.ca_schema import (
    CAFilter, 
    CAMoisPrevu,
    CAHistoriqueResponse,
    CAHistoriquePoint,
    CAPredictResponse
)
from services.ca_service import ca_registry
from data.postgres_loader import load_ca_data
import pandas as pd

router = APIRouter(prefix="/ca", tags=["CA Forecast"])


@router.get("/historique", response_model=CAHistoriqueResponse)
def get_historique(
    date_from: str = None,
    date_to: str = None,
    formation_id: int = None,
    formateur_id: int = None,
    session_type: str = None,
):
    """
    Renvoie uniquement l'historique CA (données réelles).
    Affiché par défaut quand l'utilisateur ouvre l'écran.
    """
    filters = CAFilter(
        date_from=date_from,
        date_to=date_to,
        formation_id=formation_id,
        formateur_id=formateur_id,
        session_type=session_type,
    )

    df = load_ca_data(filters)

    if df.empty:
        raise HTTPException(400, "Aucune donnée trouvée pour ces filtres.")

    # Calcul de la marge pour l'affichage
    df["marge"] = df["ca_mensuel"] - df["total_cout_formateur"] - df["total_cout_logistique"]

    historique = []
    for _, row in df.iterrows():
        historique.append(CAHistoriquePoint(
            mois=f"{int(row['annee'])}-{int(row['mois']):02d}",
            annee=int(row["annee"]),
            mois_num=int(row["mois"]),
            ca=round(float(row["ca_mensuel"]), 2),
            marge=round(float(row["marge"]), 2),
            nb_sessions=int(row["nb_sessions"]),
            total_inscrits=int(row["total_inscrits"]),
        ))

    return CAHistoriqueResponse(
        historique=historique,
        total_mois=len(historique),
        ca_moyen=round(df["ca_mensuel"].mean(), 2),
        filtres=filters,
    )


@router.post("/predict", response_model=CAPredictResponse)
def predict_ca(filters: CAFilter):
    """
    Renvoie UNIQUEMENT les prévisions (1, 3 ou 6 mois).
    Appelé quand l'utilisateur clique sur un bouton de prévision.
    """
    df = load_ca_data(filters)

    if len(df) < 3:
        raise HTTPException(400, f"Historique insuffisant ({len(df)} mois, minimum 3)")

    # Vérifie que la période demandée est valide
    nb_mois = filters.periode if filters.periode in [1, 3, 6] else 3

    previsions = ca_registry.predict_next_months(df, nb_mois=nb_mois)

    ca_values = [p["ca_predit"] for p in previsions]
    
    # Calcul tendance
    if ca_values[-1] > ca_values[0] * 1.05:
        tendance = "hausse"
    elif ca_values[-1] < ca_values[0] * 0.95:
        tendance = "baisse"
    else:
        tendance = "stable"

    return CAPredictResponse(
        previsions=[CAMoisPrevu(**p) for p in previsions],
        periode=nb_mois,
        unite="DT",
        model_used="LinearRegression",
        tendance=tendance,
    )