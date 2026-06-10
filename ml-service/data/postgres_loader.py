import pandas as pd
from db import get_connection
from schemas.ca_schema import CAFilter

"""
    data/postgres_loader.py — Connexion PostgreSQL (Supabase) → DataFrames ML

Variables .env nécessaires :
  DATABASE_URL=postgresql://user:password@host:5432/dbname
  USE_DB=1

Fonctions exportées :
  load_risk_data()         → features uniquement (label construit dans train_risk.py)
  load_inscriptions_data() → inscriptions/mois pour forecast
  load_ca_oltp()           → CA mensuel depuis table finances
  load_ca_dw()             → CA depuis DW binomtik (si disponible)
  load_sessions_data()     → features par session + label est_deficitaire
  load_last_months(n)      → derniers N mois CA
     À décommenter quand la DB est prête (scripts d'entraînement uniquement, pas FastAPI).

    Variables .env nécessaires :
    DATABASE_URL=postgresql://user:password@host:5432/dbname

    Dépendances à ajouter dans requirements.txt :
    sqlalchemy, psycopg2-binary, python-dotenv

    Fonctions exportées :
    load_risk_data()         → training/train_risk.py       (6 features + label abandon)
    load_inscriptions_data() → training/train_forecast.py   (inscriptions/mois)
    load_ca_data()           → training/train_ca.py         (CA mensuel depuis finances)
    load_sessions_data()     → training/train_deficit.py    (features par session)
    load_last_months(n)      → optionnel (rafraîchir last_data CA sans ré-entraîner)

    Tables NestJS / TypeORM :
    users, apprenants, sessions, sessions_apprenants,
    presences, performance, satisfaction, finances
"""

import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


# ─── Connexion ────────────────────────────────────────────────────────────────

def get_engine():
    if not DATABASE_URL:
        raise ValueError(
            "DATABASE_URL manquant. Ajoute-le dans ml-service/.env\n"
            "Ex: DATABASE_URL=postgresql://user:pass@host:5432/dbname"
        )
    return create_engine(DATABASE_URL)

import numpy as np
import pandas as pd
from db import get_connection

def load_data():
    conn = get_connection()
    
    query = """
    SELECT 
        EXTRACT(YEAR FROM s.date) as annee,
        EXTRACT(MONTH FROM s.date) as mois,
        COUNT(*) as nb_sessions,
        SUM(COALESCE(fin.montant, 0)) as ca_mensuel
    FROM public.sessions s
    LEFT JOIN (
        SELECT "sessionId", SUM(montant) as montant
        FROM public.finances
        WHERE type = 'paiement'
        GROUP BY "sessionId"
    ) fin ON fin."sessionId" = s.id
    WHERE s.statut = 'Completed'
    GROUP BY EXTRACT(YEAR FROM s.date), EXTRACT(MONTH FROM s.date)
    ORDER BY annee, mois;
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    
    for col in ['nb_sessions', 'ca_mensuel']:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    df['mois_cos'] = np.cos(2 * np.pi * df['mois'] / 12)
    
    
    return df

def get_features(df):
    return ['nb_sessions', 'mois_cos']

def get_features(df):
    """
    Retourne les features disponibles dans le DataFrame.
    """
    # Vérifie quelles colonnes existent réellement
    available = list(df.columns)
    
    features = []
    
    # Priorité 1 : nb_sessions (si disponible)
    if 'nb_sessions' in available:
        features.append('nb_sessions')
    
    # Priorité 2 : revenu_potentiel_total (si disponible)
    elif 'revenu_potentiel_total' in available:
        features.append('revenu_potentiel_total')
    elif 'est_ete' in df.columns:
        features.append('est_ete')
    if 'prop_it' in df.columns and len(df) >= 10:
        features.append('prop_it')
        
    
    # Saisonnalité (toujours présente car créée dans load_data)
    features.append('mois_cos')
    
    return features


# ─── Risk — 6 features SANS label (label probabiliste dans train_risk.py) ────

def load_risk_data(payment_type: str = "impaye") -> pd.DataFrame:
    """
    Charge les 6 features par apprenant depuis OLTP.
    Le label 'abandon' est intentionnellement ABSENT ici —
    il est construit de façon probabiliste dans train_risk.py
    pour éviter l'apprentissage trivial des règles métier.

    Colonnes retournées :
      apprenant_id, taux_presence, absences_consecutives,
      moyenne_notes, tendance_notes, moyenne_satisfaction,
      jours_retard_paiement
    """
    engine = get_engine()

    query = """
        WITH

        presence_stats AS (
            SELECT
                p."apprenantId",
                COUNT(*)::int                                                AS total_sessions,
                COUNT(*) FILTER (WHERE p."estPresent" = true)::int           AS sessions_presentes,
                ROUND(
                    COUNT(*) FILTER (WHERE p."estPresent" = true)::decimal
                    / NULLIF(COUNT(*), 0), 4
                )                                                            AS taux_presence
            FROM presences p
            GROUP BY p."apprenantId"
            HAVING COUNT(*) >= 3
        ),

        absences_consecutives AS (
            SELECT
                p."apprenantId",
                (
                    SELECT COUNT(*)::int
                    FROM presences p2
                    WHERE p2."apprenantId" = p."apprenantId"
                      AND p2."estPresent"  = false
                      AND p2."dateMarquage" > COALESCE(
                          (
                              SELECT MAX(p3."dateMarquage")
                              FROM presences p3
                              WHERE p3."apprenantId" = p."apprenantId"
                                AND p3."estPresent"  = true
                          ),
                          '2000-01-01'
                      )
                ) AS absences_consecutives
            FROM presences p
            GROUP BY p."apprenantId"
        ),

        notes_stats AS (
            SELECT
                perf."apprenantId",
                ROUND(AVG(perf.note)::decimal, 2)                           AS moyenne_notes,
                ROUND((
                    (SELECT note FROM performance p2
                     WHERE p2."apprenantId" = perf."apprenantId"
                     ORDER BY p2.date DESC LIMIT 1)
                    -
                    (SELECT note FROM performance p3
                     WHERE p3."apprenantId" = perf."apprenantId"
                     ORDER BY p3.date ASC LIMIT 1)
                )::decimal, 2)                                              AS tendance_notes
            FROM performance perf
            GROUP BY perf."apprenantId"
            HAVING COUNT(*) >= 2
        ),

        satisfaction_stats AS (
            SELECT
                sat."apprenantId",
                ROUND(AVG(sat.note)::decimal, 2) AS moyenne_satisfaction
            FROM satisfaction sat
            GROUP BY sat."apprenantId"
        ),

        finance_stats AS (
            SELECT
                f."apprenantId",
                COALESCE(
                    MAX(EXTRACT(DAY FROM NOW() - f.date)::int)
                    FILTER (
                        WHERE f.type = :payment_type
                        AND NOT EXISTS (
                            SELECT 1 FROM finances f2
                            WHERE f2."apprenantId" = f."apprenantId"
                              AND f2.type = 'paiement'
                              AND f2.date > f.date
                        )
                    ),
                    0
                ) AS jours_retard_paiement
            FROM finances f
            WHERE f."apprenantId" IS NOT NULL
            GROUP BY f."apprenantId"
        )

        SELECT
            a.id                                                        AS apprenant_id,
            COALESCE(ps.taux_presence,         0)                       AS taux_presence,
            COALESCE(ac.absences_consecutives, 0)                       AS absences_consecutives,
            COALESCE(ns.moyenne_notes,         10)                      AS moyenne_notes,
            COALESCE(ns.tendance_notes,         0)                      AS tendance_notes,
            COALESCE(ss.moyenne_satisfaction,  3.0)                     AS moyenne_satisfaction,
            COALESCE(fs.jours_retard_paiement,  0)                      AS jours_retard_paiement
        FROM apprenants a
        LEFT JOIN presence_stats        ps ON ps."apprenantId" = a.id
        LEFT JOIN absences_consecutives ac ON ac."apprenantId" = a.id
        LEFT JOIN notes_stats           ns ON ns."apprenantId" = a.id
        LEFT JOIN satisfaction_stats    ss ON ss."apprenantId" = a.id
        LEFT JOIN finance_stats         fs ON fs."apprenantId" = a.id
        WHERE ps."apprenantId" IS NOT NULL
    """

    df = pd.read_sql(text(query), get_engine(), params={"payment_type": payment_type})

    assert len(df) >= 20, (
        f"Pas assez d'apprenants avec données complètes ({len(df)}). Minimum 20 requis."
    )

    print(f"[load_risk_data] ✅ {len(df)} apprenants chargés")
    print(f"  → taux_presence moyen : {df['taux_presence'].mean():.2f}")
    print(f"  → moyenne_notes moyenne : {df['moyenne_notes'].mean():.2f}")
    return df


# ─── Forecast — inscriptions par mois ────────────────────────────────────────

def load_inscriptions_data() -> pd.DataFrame:
    """Inscriptions dans les sessions par mois. Colonnes : ds ('YYYY-MM'), y (int)"""
    engine = get_engine()

    query = """
        SELECT
            TO_CHAR(s.date::date, 'YYYY-MM')  AS ds,
            COUNT(sa."apprenantId")::int       AS y
        FROM sessions_apprenants sa
        JOIN sessions s ON s.id = sa."sessionId"
        WHERE s.date IS NOT NULL
        GROUP BY TO_CHAR(s.date::date, 'YYYY-MM')
        ORDER BY ds
    """

    df = pd.read_sql(text(query), engine)
    engine.dispose()

    assert len(df) >= 3, f"Seulement {len(df)} mois. Minimum 3 requis."

    print(f"[load_inscriptions_data] ✅ {len(df)} mois chargés")
    print(f"  → Total inscriptions : {df['y'].sum()}")
    print(f"  → Période : {df['ds'].iloc[0]} → {df['ds'].iloc[-1]}")
    return df


# ─── CA — OLTP ───────────────────────────────────────────────────────────────

def load_ca_oltp() -> pd.DataFrame:
    """CA mensuel depuis table finances OLTP."""
    engine = get_engine()

    query = """
        SELECT
            EXTRACT(YEAR  FROM f.date)::int                                   AS annee,
            EXTRACT(MONTH FROM f.date)::int                                   AS mois_num,
            ((EXTRACT(MONTH FROM f.date)::int - 1) / 3 + 1)::int              AS trimestre,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'paiement'),            0) AS ca_mensuel,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_formateur'),   0) AS total_cout_formateur,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_logistique'),  0) AS total_cout_logistique,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'impaye'),              0) AS total_impaye,
            COUNT(DISTINCT f."sessionId")                                          AS nb_sessions
        FROM finances f
        GROUP BY EXTRACT(YEAR FROM f.date), EXTRACT(MONTH FROM f.date)
        ORDER BY annee, mois_num
    """

    df = pd.read_sql(text(query), engine)
    engine.dispose()
    df = df.fillna(0)

    if "mois_num" in df.columns and "mois" not in df.columns:
        df["mois"] = df["mois_num"].astype(int)

    assert len(df) >= 3, f"Pas assez de mois ({len(df)}). Minimum 3."
    print(f"[load_ca_oltp] ✅ {len(df)} mois chargés depuis OLTP")
    return df


# ─── CA — DW binomtik ────────────────────────────────────────────────────────

def load_ca_dw() -> pd.DataFrame:
    """CA depuis Data Warehouse (tables dw.*) — binomtik uniquement."""
    engine = get_engine()

    query = """
        SELECT
            t.annee, t.mois, t.trimestre,
            SUM(CASE WHEN tf.type = 'paiement'           THEN f.montant ELSE 0 END) AS ca_mensuel,
            SUM(CASE WHEN tf.type = 'depense_formateur'  THEN f.montant ELSE 0 END) AS total_cout_formateur,
            SUM(CASE WHEN tf.type = 'depense_logistique' THEN f.montant ELSE 0 END) AS total_cout_logistique,
            COUNT(DISTINCT CASE WHEN tf.type = 'paiement' THEN f.sk_session   END)  AS nb_sessions,
            COUNT(DISTINCT CASE WHEN tf.type = 'paiement' THEN f.sk_apprenant END)  AS total_inscrits,
            SUM(CASE WHEN tf.type = 'impaye'             THEN f.montant ELSE 0 END) AS total_impaye
        FROM dw.fact_finance f
        JOIN dw.dim_temps        t  ON t.sk_temps        = f.sk_temps
        JOIN dw.dim_type_finance tf ON tf.sk_type_finance = f.sk_type_finance
        GROUP BY t.annee, t.mois, t.trimestre
        ORDER BY t.annee, t.mois
    """

    df = pd.read_sql(text(query), engine)
    engine.dispose()

    for col in ["ca_mensuel", "total_cout_formateur", "total_cout_logistique", "total_impaye"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    for col in ["nb_sessions", "total_inscrits", "trimestre"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    print(f"[load_ca_dw] ✅ {len(df)} mois chargés depuis DW")
    return df


# ─── Sessions / Deficit ───────────────────────────────────────────────────────

def load_sessions_data() -> pd.DataFrame:
    """Features financières par session + label est_deficitaire (OLTP)."""
    engine = get_engine()

    query = """
        SELECT
            s.id                                                              AS sk_session,
            EXTRACT(MONTH FROM s.date::date)::int                             AS mois,
            COALESCE(s.capacite, 20)                                          AS capacite,
            s.type                                                            AS type_session,
            COUNT(DISTINCT sa."apprenantId")                                  AS nb_inscrits,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_formateur'),  0) AS cout_formateur,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_logistique'), 0) AS cout_logistique,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'paiement'),           0) AS montant_inscriptions,
            CASE
                WHEN (
                    COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_formateur'),  0) +
                    COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_logistique'), 0)
                ) > COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'paiement'), 0)
                THEN 1 ELSE 0
            END                                                               AS est_deficitaire
        FROM sessions s
        LEFT JOIN sessions_apprenants sa ON sa."sessionId" = s.id
        LEFT JOIN finances f             ON f."sessionId"  = s.id
        GROUP BY s.id, s.date, s.capacite, s.type
        HAVING COUNT(DISTINCT sa."apprenantId") > 0
        ORDER BY s.date
    """

    df = pd.read_sql(text(query), engine)
    engine.dispose()
    df = df.fillna(0)

    if "duree_jours" not in df.columns:
        df["duree_jours"] = 1
    if "mois" in df.columns:
        df["mois"] = df["mois"].astype(int)

    assert len(df) >= 50, f"Pas assez de sessions ({len(df)}). Minimum 50."
    print(f"[load_sessions_data] ✅ {len(df)} sessions chargées")
    print(f"  → Taux déficitaires : {df['est_deficitaire'].mean():.1%}")
    return df


# ─── Last months CA ───────────────────────────────────────────────────────────

def load_last_months(n: int = 12) -> pd.DataFrame:
    """Derniers N mois CA pour predict sans ré-entraîner."""
    engine = get_engine()

    query = f"""
        SELECT
            EXTRACT(YEAR  FROM f.date)::int                                   AS annee,
            EXTRACT(MONTH FROM f.date)::int                                   AS mois_num,
            ((EXTRACT(MONTH FROM f.date)::int - 1) / 3 + 1)::int              AS trimestre,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'paiement'),           0) AS ca_mensuel,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_formateur'),  0) AS total_cout_formateur,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_logistique'), 0) AS total_cout_logistique,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'impaye'),             0) AS total_impaye,
            COUNT(DISTINCT f."sessionId")                                          AS nb_sessions
        FROM finances f
        GROUP BY EXTRACT(YEAR FROM f.date), EXTRACT(MONTH FROM f.date)
        ORDER BY annee DESC, mois_num DESC
        LIMIT {n}
    """

    df = pd.read_sql(text(query), engine)
    engine.dispose()
    return df.sort_values(["annee", "mois_num"]).reset_index(drop=True)