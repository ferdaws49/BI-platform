# ml-service/services/ca_service.py
import pandas as pd
from typing import Optional, List, Dict, Any
from data.postgres_loader_sessions import get_connection

def get_historique(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    formation_id: Optional[int] = None,
    formateur_id: Optional[int] = None,
    session_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Retourne le CA historique agrégé par mois depuis la DW.
    """
    conn = get_connection()
    
    # Utilise ta DW pour calculer le CA réalisé par mois
    query = """
    SELECT 
        TO_CHAR(t.date_key, 'YYYY-MM') as month,
        COALESCE(SUM(f.montant), 0) as ca_net
    FROM dw.fact_finance f
    JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
    JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
    LEFT JOIN dw.dim_formateur fr ON f.sk_formateur = fr.sk_formateur
    LEFT JOIN dw.dim_session s ON f.sk_session = s.sk_session
    WHERE tf.type = 'paiement'
    """
    
    params = []
    
    if date_from:
        query += " AND t.date_key >= %s"
        params.append(date_from)
    if date_to:
        query += " AND t.date_key <= %s"
        params.append(date_to)
    if formation_id:
        query += " AND fo.formation_id = %s"
        params.append(formation_id)
    if formateur_id:
        query += " AND fr.formateur_id = %s"
        params.append(formateur_id)
    if session_type:
        query += " AND s.type_session = %s"
        params.append(session_type)
    
    query += " GROUP BY TO_CHAR(t.date_key, 'YYYY-MM') ORDER BY month"
    
    df = pd.read_sql(query, conn, params=params)
    
    if df.empty:
        return []
    
    points = []
    for _, row in df.iterrows():
        points.append({
            "month": row['month'],
            "historical": float(row['ca_net']) if row['ca_net'] is not None else 0,
            "predicted": None,
        })
    
    return points


def predict_ca(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    formation_id: Optional[int] = None,
    formateur_id: Optional[int] = None,
    session_type: Optional[str] = None,
    horizon: int = 3,
) -> List[Dict[str, Any]]:
    """
    Retourne l'historique + les prédictions futures.
    """
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    # 1. Historique depuis la DW
    historique = get_historique(
        date_from=date_from,
        date_to=date_to,
        formation_id=formation_id,
        formateur_id=formateur_id,
        session_type=session_type,
    )
    
    if not historique:
        return []
    
    # 2. Prédictions (tendance simple)
    last_point = historique[-1]
    last_month = datetime.strptime(last_point['month'], '%Y-%m')
    
    # Calcule la moyenne des 3 derniers mois
    recent_values = [p['historical'] for p in historique[-3:] if p['historical'] is not None]
    avg_ca = sum(recent_values) / len(recent_values) if recent_values else 0
    
    # Génère les prédictions
    predictions = historique.copy()
    
    for i in range(1, horizon + 1):
        future_month = last_month + relativedelta(months=i)
        month_str = future_month.strftime('%Y-%m')
        
        predictions.append({
            "month": month_str,
            "historical": None,
            "predicted": round(avg_ca, 2),
        })
    
    return predictions