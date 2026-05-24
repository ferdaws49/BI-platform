import pandas as pd
from data.db import get_connection


def load_sessions_data():

    conn = get_connection()

    query = """
    SELECT
        s.session_id,
        s.type_session,
        s.capacite,
        s.prix_session,

        t.annee,
        t.mois,
        t.trimestre,

        -- 👥 inscriptions
        COUNT(DISTINCT sa.apprenant_id) AS nb_inscrits,

        -- 💰 revenus
        COALESCE(SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END), 0)
            AS montant_inscriptions,

        -- 💸 coûts
        COALESCE(SUM(CASE WHEN tf.type = 'depense_formateur' THEN f.montant ELSE 0 END), 0)
            AS cout_formateur,

        COALESCE(SUM(CASE WHEN tf.type = 'depense_logistique' THEN f.montant ELSE 0 END), 0)
            AS cout_logistique

    FROM dw.dim_session s

    LEFT JOIN session_apprenants sa
        ON sa.session_id = s.session_id

    LEFT JOIN dw.fact_finance f
        ON f.sk_session = s.sk_session

    LEFT JOIN dw.dim_type_finance tf
        ON tf.sk_type_finance = f.sk_type_finance

    LEFT JOIN dw.dim_temps t
        ON t.sk_temps = f.sk_temps

    GROUP BY
        s.session_id,
        s.type_session,
        s.capacite,
        s.prix_session,
        t.annee,
        t.mois,
        t.trimestre

    ORDER BY t.annee, t.mois
    """

    df = pd.read_sql(query, conn)
    conn.close()

    # 🧹 cleaning
    for col in [
        "nb_inscrits",
        "montant_inscriptions",
        "cout_formateur",
        "cout_logistique"
    ]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    print(f"[sessions_loader] 📦 {len(df)} sessions chargées")
    return df