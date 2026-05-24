import os
import psycopg2
import pandas as pd
from dotenv import load_dotenv
from pathlib import Path

from data.db import get_connection



def load_ca_data():
    conn = get_connection()

    query = """
    SELECT
      t.annee,
      t.mois,
      t.trimestre,
      SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) AS ca_mensuel,
      SUM(CASE WHEN tf.type = 'depense_formateur'  THEN f.montant ELSE 0 END) AS total_cout_formateur,
      SUM(CASE WHEN tf.type = 'depense_logistique' THEN f.montant ELSE 0 END) AS total_cout_logistique,
      COUNT(DISTINCT CASE WHEN tf.type = 'paiement' THEN f.sk_session END)   AS nb_sessions,
      COUNT(DISTINCT CASE WHEN tf.type = 'paiement' THEN f.sk_apprenant END) AS total_inscrits,
      SUM(CASE WHEN tf.type = 'impaye' THEN f.montant ELSE 0 END) AS total_impaye
    FROM dw.fact_finance f
    JOIN dw.dim_temps t ON t.sk_temps = f.sk_temps
    JOIN dw.dim_type_finance tf ON tf.sk_type_finance = f.sk_type_finance
    GROUP BY t.annee, t.mois, t.trimestre
    ORDER BY t.annee, t.mois
    """

    df = pd.read_sql(query, conn)
    conn.close()

    for col in ["ca_mensuel", "total_cout_formateur", "total_cout_logistique", "total_impaye"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    for col in ["nb_sessions", "total_inscrits", "trimestre"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    print(f"[postgres_loader] 📦 {len(df)} mois chargés")
    return df