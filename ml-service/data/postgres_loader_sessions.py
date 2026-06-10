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

    # ── CORRECTION : JOINs dans le bon ordre ──
    query = f"""
    SELECT
      s.session_id::text AS session_id,
      COUNT(DISTINCT f.sk_apprenant) AS nb_inscrits,
      s.capacite,
      COALESCE(SUM(ABS(f.montant)) FILTER (WHERE tf.type = 'paiement'), 0) AS revenu,
      COALESCE(SUM(ABS(f.montant)) FILTER (WHERE tf.type = 'depense_formateur'), 0) AS cout_formateur,
      COALESCE(SUM(ABS(f.montant)) FILTER (WHERE tf.type = 'depense_logistique'), 0) AS cout_logistique,
      COALESCE(SUM(f.montant) FILTER (WHERE tf.type = 'impaye'), 0) AS impayes,
      s.date::text AS date
    FROM dw.dim_session s
    LEFT JOIN dw.fact_finance f ON f.sk_session = s.sk_session
    LEFT JOIN dw.dim_type_finance tf ON tf.sk_type_finance = f.sk_type_finance
    LEFT JOIN dw.dim_formation fo ON f.sk_formation = fo.sk_formation
    LEFT JOIN dw.dim_formateur fr ON f.sk_formateur = fr.sk_formateur
    WHERE {where_sql}
    GROUP BY s.session_id, s.capacite, s.date
    """

    df = pd.read_sql(query, conn, params=params)
    conn.close()

    # --- CORRECTION ICI ---
    # On convertit en numérique et on prend la valeur ABSOLUE (pour transformer -30 en 30)
    for col in ["revenu", "cout_formateur", "cout_logistique", "impayes"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        df[col] = df[col].abs()  # <--- FORCE LA VALEUR POSITIVE

    for col in ["nb_inscrits", "capacite"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)



    return df