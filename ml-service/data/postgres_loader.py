import pandas as pd
from db import get_connection
from schemas.ca_schema import CAFilter

def load_ca_data(filters: CAFilter) -> pd.DataFrame:
    conn = get_connection()
    conditions = ["1=1"]
    params = []

    if filters.formation_id:
        conditions.append("fo.formation_id = %s")
        params.append(filters.formation_id)
    # ... ajoute les autres filtres si nécessaire ...

    query = f"""
    SELECT
      t.annee, t.mois,
      SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) AS ca_mensuel,
      SUM(CASE WHEN tf.type = 'depense_formateur' THEN f.montant ELSE 0 END) AS total_cout_formateur,
      SUM(CASE WHEN tf.type = 'depense_logistique' THEN f.montant ELSE 0 END) AS total_cout_logistique,
      COUNT(DISTINCT CASE WHEN tf.type = 'paiement' THEN f.sk_session END) AS nb_sessions,
      SUM(CASE WHEN tf.type = 'paiement' THEN 1 ELSE 0 END) AS total_inscrits
    FROM dw.fact_finance f
    JOIN dw.dim_temps t ON t.sk_temps = f.sk_temps
    JOIN dw.dim_type_finance tf ON tf.sk_type_finance = f.sk_type_finance
    LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
    WHERE {" AND ".join(conditions)}
    GROUP BY t.annee, t.mois
    ORDER BY t.annee, t.mois
    """
    df = pd.read_sql(query, conn, params=params)
    conn.close()
    
    # Nettoyage rapide
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    return df