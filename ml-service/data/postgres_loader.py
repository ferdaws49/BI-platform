#import os
#import pandas as pd
#from sqlalchemy import create_engine
#from dotenv import load_dotenv

#thotthou fi .env
#DATABASE_URL=postgresql://user:password@localhost:5432/nom_datawarehouse
#load_dotenv()
#DATABASE_URL = os.getenv("DATABASE_URL")


#def get_engine():
    #return create_engine(DATABASE_URL)


# ─── CA Mensuel ───────────────────────────────────────────────────────────────

#def load_ca_data() -> pd.DataFrame:
    #"""
    #Charge le CA mensuel réel depuis le datawarehouse.
    #Utilisé par training/train_ca.py
    #"""
    #engine = get_engine()

    #query = """
    #    SELECT
    #        dt.annee,
    #        dt.mois,
    #        dt.trimestre,

    #        -- CA = somme des paiements reçus
    #        SUM(CASE WHEN ff.est_paiement = TRUE
    #                 THEN ff.montant ELSE 0 END)          AS ca_mensuel,

    #       -- Coûts
    #        SUM(ff.cout_formateur)                         AS total_cout_formateur,
    #        SUM(ff.cout_logistique)                        AS total_cout_logistique,

    #        -- Inscrits
    #        SUM(ff.nb_inscrits)                            AS total_inscrits,

    #        -- Nombre de sessions distinctes
    #        COUNT(DISTINCT ff.sk_session)                  AS nb_sessions,

    #        -- Impayés
    #        SUM(CASE WHEN ff.est_impaye = TRUE
    #                 THEN ff.montant ELSE 0 END)           AS total_impaye

    #    FROM fact_finance ff
    #    JOIN dim_temps    dt  ON ff.sk_temps    = dt.sk_temps

    #    GROUP BY dt.annee, dt.mois, dt.trimestre
    #    ORDER BY dt.annee, dt.mois
    #"""

    #df = pd.read_sql(query, engine)
    #engine.dispose()

    #print(f"[load_ca_data] 📦 {len(df)} mois chargés depuis le datawarehouse")
    #return df


# ─── Sessions Déficitaires ────────────────────────────────────────────────────

#def load_sessions_data() -> pd.DataFrame:
    #"""
    #Charge les sessions historiques pour entraîner le modèle déficit.
    #Utilisé par training/train_deficit.py
    #"""
    #engine = get_engine()

    #query = """
    #    SELECT
    #        ff.sk_session,
    #        dt.mois,
    #        ds.capacite,
    #        ds.type_session,

    #        -- Features financières
    #        SUM(ff.nb_inscrits)                             AS nb_inscrits,
    #        SUM(ff.cout_formateur)                          AS cout_formateur,
    #        SUM(ff.cout_logistique)                         AS cout_logistique,

    #        -- Revenus = paiements reçus
    #        SUM(CASE WHEN ff.est_paiement = TRUE
    #                 THEN ff.montant ELSE 0 END)            AS montant_inscriptions,

    #       -- Label : 1 = déficitaire (coûts > revenus)
    #        CASE WHEN SUM(ff.cout_formateur + ff.cout_logistique)
    #                    > SUM(CASE WHEN ff.est_paiement = TRUE
    #                               THEN ff.montant ELSE 0 END)
    #             THEN 1 ELSE 0 END                          AS est_deficitaire

    #    FROM fact_finance ff
    #    JOIN dim_temps   dt  ON ff.sk_temps   = dt.sk_temps
    #    JOIN dim_session ds  ON ff.sk_session = ds.sk_session

    #    GROUP BY ff.sk_session, dt.mois, ds.capacite, ds.type_session
    #    HAVING SUM(ff.nb_inscrits) > 0
    #    ORDER BY ff.sk_session
    #"""

    #df = pd.read_sql(query, engine)
    #engine.dispose()

    #print(f"[load_sessions_data] 📦 {len(df)} sessions chargées depuis le datawarehouse")
    #return df


# ─── Prévision en temps réel (optionnel) ─────────────────────────────────────

#def load_last_months(n: int = 12) -> pd.DataFrame:
    #"""
    #Charge les N derniers mois pour alimenter predict_next_months()
    #depuis les vraies données au lieu du last_data du .pkl
    #"""
    #engine = get_engine()

    #query = f"""
    #    SELECT
    #        dt.annee,
    #        dt.mois,
    #        dt.trimestre,
    #        SUM(CASE WHEN ff.est_paiement = TRUE
    #                 THEN ff.montant ELSE 0 END)   AS ca_mensuel,
    #        SUM(ff.cout_formateur)                  AS total_cout_formateur,
    #        SUM(ff.cout_logistique)                 AS total_cout_logistique,
    #        SUM(ff.nb_inscrits)                     AS total_inscrits,
    #        COUNT(DISTINCT ff.sk_session)           AS nb_sessions,
    #        SUM(CASE WHEN ff.est_impaye = TRUE
    #                 THEN ff.montant ELSE 0 END)    AS total_impaye
    #    FROM fact_finance ff
    #    JOIN dim_temps dt ON ff.sk_temps = dt.sk_temps
    #    GROUP BY dt.annee, dt.mois, dt.trimestre
    #    ORDER BY dt.annee DESC, dt.mois DESC
    #    LIMIT {n}
    #"""

    #df = pd.read_sql(query, engine)
    #engine.dispose()

    # Remettre dans l'ordre chronologique
    #df = df.sort_values(["annee", "mois"]).reset_index(drop=True)
    #return df