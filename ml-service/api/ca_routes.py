from fastapi import APIRouter, HTTPException
from schemas.ca_schema import (
    CAFilter, 
    CAHistoriqueResponse, 
    CAPredictResponse, 
    CAHistoriquePoint, 
    CAMoisPrevu
)
from services.ca_service import ca_service
from data.postgres_loader import load_data

router = APIRouter(prefix="/ca", tags=["CA Forecast"])

@router.get("/historique", response_model=CAHistoriqueResponse)
def get_historique(
    date_from: str = None,
    date_to: str = None,
    formation_id: int = None,
    formateur_id: int = None,
    session_type: str = None,
):
    """Récupère l'historique réel pour affichage sur le dashboard."""
    filters = CAFilter(
        date_from=date_from,
        date_to=date_to,
        formation_id=formation_id,
        formateur_id=formateur_id,
        session_type=session_type
    )

    df = load_data(filters)
    if df.empty:
        raise HTTPException(400, "Aucune donnée trouvée pour ces filtres.")

    # Transformation du DataFrame en points d'historique
    historique = []
    for _, row in df.iterrows():
        # Calcul de la marge réelle
        marge = row["ca_mensuel"] - row["total_cout_formateur"] - row["total_cout_logistique"]
        
        historique.append(CAHistoriquePoint(
            mois=f"{int(row['annee'])}-{int(row['mois']):02d}",
            annee=int(row["annee"]),
            mois_num=int(row["mois"]),
            ca=round(float(row["ca_mensuel"]), 2),
            marge=round(float(marge), 2),
            nb_sessions=int(row["nb_sessions"]),
            total_inscrits=int(row["total_inscrits"])
        ))

    return CAHistoriqueResponse(
        historique=historique,
        total_mois=len(historique),
        ca_moyen=round(df["ca_mensuel"].mean(), 2),
        filtres=filters
    )

@router.post("/predict", response_model=CAPredictResponse)
def predict_ca(filters: CAFilter):
    """
    Génère les prévisions CA sur 1, 3 ou 6 mois.
    
    Le modèle utilise les sessions planifiées dans la base pour prédire.
    """
    # Validation période
    if filters.periode not in [1, 3, 6]:
        raise HTTPException(400, "La période doit être 1, 3 ou 6 mois.")
    
    # Appel du service (va chercher les sessions planifiées automatiquement)
    result = ca_service.predict_period(nb_mois=filters.periode)
    
    if "error" in result:
        raise HTTPException(500, result["error"])
    
    # Tendance : compare le 1er mois prédit vs le dernier mois réel historique
    tendance = "stable"
    if ca_service.history is not None and len(ca_service.history) > 0:
        dernier_ca_reel = float(ca_service.history.iloc[-1]["ca_mensuel"])
        premier_ca_predit = result["previsions"][0]["ca_predit"] if result["previsions"] else 0
        
        if premier_ca_predit > dernier_ca_reel * 1.05:
            tendance = "hausse"
        elif premier_ca_predit < dernier_ca_reel * 0.95:
            tendance = "baisse"
        else:
            tendance = "stable"
    
    return CAPredictResponse(
        previsions=[CAMoisPrevu(**p) for p in result["previsions"]],
        periode=filters.periode,
        ca_total=result.get("ca_total"),
        marge_total=result.get("marge_total"),
        tendance=tendance
    )