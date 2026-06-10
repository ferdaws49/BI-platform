import numpy as np
import pandas as pd
from db import get_connection
from schemas.deficit_schema import SessionFilter


def load_sessions_data(filters: SessionFilter) -> pd.DataFrame:
    conn = get_connection()
    conditions = ["s.capacite > 0"]
    params = []

    if filters.date_from:
        conditions.append("s.date >= %s")
        params.append(filters.date_from)
    if filters.date_to:
        conditions.append("s.date <= %s")
        params.append(filters.date_to)
    if filters.formation_id:
        conditions.append("fo.formation_id = %s")
        params.append(filters.formation_id)
    if filters.formateur_id:
        conditions.append("fr.formateur_id = %s")
        params.append(filters.formateur_id)
    if filters.session_type:
        conditions.append("s.type_session = %s")
        params.append(filters.session_type)

    where_sql = " AND ".join(conditions)

    query = f"""
    SELECT
      s.session_id::text AS session_id,
      s.titre::text AS session_name,
      s.type_session,
      s.capacite,
      s.prix_session,
      s.date::text AS date,

      -- Dimensions via fact_finance (MAX pour éviter les doublons GROUP BY)
      MAX(fo.formation_id) AS formation_id,
      MAX(fo.titre) AS formation_name,
      MAX(fo.categorie) AS categorie,
      MAX(fr.formateur_id) AS formateur_id,

      -- Données pour le LABEL (post-session) -- NE PAS utiliser comme features
      COUNT(DISTINCT f.sk_apprenant) AS nb_inscrits,
      COALESCE(SUM(ABS(f.montant)) FILTER (WHERE tf.type = 'paiement'), 0) AS revenu,
      COALESCE(SUM(f.montant) FILTER (WHERE tf.type = 'depense_formateur'), 0) AS cout_formateur,
      COALESCE(SUM(f.montant) FILTER (WHERE tf.type = 'depense_logistique'), 0) AS cout_logistique,
      COALESCE(SUM(f.montant) FILTER (WHERE tf.type = 'impaye'), 0) AS impayes

    FROM dw.dim_session s
    LEFT JOIN dw.fact_finance f ON f.sk_session = s.sk_session
    LEFT JOIN dw.dim_type_finance tf ON tf.sk_type_finance = f.sk_type_finance
    LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
    LEFT JOIN dw.dim_formateur fr ON f.sk_formateur = fr.sk_formateur
    WHERE {where_sql}
    GROUP BY s.session_id, s.titre, s.type_session, s.capacite, s.prix_session, s.date
    """

    df = pd.read_sql(query, conn, params=params)
    conn.close()

    # Conversion numérique sécurisée : on ne convertit que les colonnes qui existent
    numeric_cols = ["revenu", "cout_formateur", "cout_logistique", "impayes", "prix_session"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    int_cols = ["nb_inscrits", "capacite"]
    for col in int_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    # --- CORRECTION CRITIQUE : remplacer NaN par None pour Pydantic ---
    # Les colonnes optionnelles (formation_id, formateur_id, categorie) peuvent être NULL
    df = df.replace({np.nan: None})

    return df 