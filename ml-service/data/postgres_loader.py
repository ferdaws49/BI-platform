import pandas as pd
from db import get_connection

"""
    data/postgres_loader.py — Connexion PostgreSQL (Supabase) → DataFrames ML

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


def get_engine():
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    """Connexion SQLAlchemy — une engine par requête, fermée après read_sql."""
    if not DATABASE_URL:

        raise ValueError(
            "DATABASE_URL manquant. Ajoute-le dans ml-service/.env "
            "(ex. postgresql://user:pass@host:5432/dbname)"
        )
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # 2. Correction pour Pgbouncer : supprimer le paramètre qui fait planter psycopg2
    if "pgbouncer=true" in DATABASE_URL:
        # On retire pgbouncer=true de l'URL
        DATABASE_URL = DATABASE_URL.replace("pgbouncer=true", "")
        # On nettoie les éventuels ?? ou ?& restants
        DATABASE_URL = DATABASE_URL.replace("?&", "?").replace("&&", "&").rstrip("?").rstrip("&")

    return create_engine(DATABASE_URL)

import numpy as np
import pandas as pd
from db import get_connection


def get_filtered_finance_data(filters=None):
    if filters is None:
        filters = {}
    
    query = """
    WITH sessions_payantes AS (
        -- Seules les sessions avec au moins un vrai paiement
        SELECT DISTINCT f.sk_session
        FROM dw.fact_finance f
        JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
        WHERE tf.type = 'paiement'
    ),
    capacite_net AS (
        SELECT 
            EXTRACT(YEAR FROM s.date)::INTEGER as annee,
            EXTRACT(MONTH FROM s.date)::INTEGER as mois,
            SUM(s.capacite) as capacite_plan
        FROM dw.dim_session s
        WHERE s.date IS NOT NULL
          AND EXISTS (SELECT 1 FROM sessions_payantes p WHERE p.sk_session = s.sk_session)
        GROUP BY 1, 2
    )
    SELECT 
        t.annee, t.mois,
        SUM(CASE WHEN tf.type = 'paiement' THEN f.montant ELSE 0 END) as ca_reel,
        SUM(CASE WHEN tf.type = 'impaye' THEN f.montant ELSE 0 END) as flux_impayes,
        COUNT(DISTINCT f.sk_apprenant) as nb_apprenants_uniques,
        COUNT(DISTINCT f.sk_session) as nb_sessions_plan,
        MAX(COALESCE(cn.capacite_plan, 0)) as capacite_plan
    FROM dw.fact_finance f
    JOIN dw.dim_temps t ON f.sk_temps = t.sk_temps
    JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    LEFT JOIN capacite_net cn ON cn.annee = t.annee AND cn.mois = t.mois
    WHERE 1=1
    """
    
    params = {}
    if filters.get('sk_formateur'):
        query += " AND f.sk_formateur = :sk_formateur"
        params['sk_formateur'] = filters['sk_formateur']
    if filters.get('sk_formation'):
        query += " AND f.sk_formation = :sk_formation"
        params['sk_formation'] = filters['sk_formation']
    if filters.get('date_debut') and filters.get('date_fin'):
        query += " AND t.date_key BETWEEN :date_debut AND :date_fin"
        params['date_debut'] = filters['date_debut']
        params['date_fin'] = filters['date_fin']
    
    query += " GROUP BY t.annee, t.mois ORDER BY t.annee, t.mois"
    
   
    
    engine = get_engine()
    try:
        df = pd.read_sql(text(query), engine, params=params)
        return df
    except Exception as e:
        print(f"❌ Erreur SQL : {e}")
        return None

def load_risk_data(payment_type: str = "impaye") -> pd.DataFrame:
    """Charge les 6 features par apprenant + label abandon.

    Args:
        payment_type: Type de finance à utiliser pour calculer le retard
                      (par défaut 'impaye'). Permet d'aligner loader/Nest.

    Label construit par règles métier (pas de colonne 'abandon' en DB) :
      abandon = 1 si :
        - taux_presence < 60 %
        - OU moyenne_notes < 8/20
        - OU absences_consecutives >= 4
        - OU jours_retard_paiement > 45

    Colonnes retournées :
      apprenant_id, taux_presence, absences_consecutives,
      moyenne_notes, tendance_notes, moyenne_satisfaction,
      jours_retard_paiement, abandon
    """
    engine = get_engine()

    query = """
        WITH

        presence_stats AS (
            SELECT
                p."apprenantId",
                COUNT(*)::int                                              AS total_sessions,
                COUNT(*) FILTER (WHERE p."estPresent" = true)::int         AS sessions_presentes,
                ROUND(
                    COUNT(*) FILTER (WHERE p."estPresent" = true)::decimal
                    / NULLIF(COUNT(*), 0), 4
                )                                                          AS taux_presence
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
                ROUND(AVG(perf.note)::decimal, 2)                         AS moyenne_notes,
                ROUND((
                    (SELECT note FROM performance p2
                     WHERE p2."apprenantId" = perf."apprenantId"
                     ORDER BY p2.date DESC LIMIT 1)
                    -
                    (SELECT note FROM performance p3
                     WHERE p3."apprenantId" = perf."apprenantId"
                     ORDER BY p3.date ASC LIMIT 1)
                )::decimal, 2)                                            AS tendance_notes
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
                    FILTER (WHERE f.type = :payment_type),
                    0
                ) AS jours_retard_paiement
            FROM finances f
            WHERE f."apprenantId" IS NOT NULL
            GROUP BY f."apprenantId"
        )

        SELECT
            a.id                                                        AS apprenant_id,
            COALESCE(ps.taux_presence,          0)                      AS taux_presence,
            COALESCE(ac.absences_consecutives,  0)                      AS absences_consecutives,
            COALESCE(ns.moyenne_notes,          10)                     AS moyenne_notes,
            COALESCE(ns.tendance_notes,          0)                     AS tendance_notes,
            COALESCE(ss.moyenne_satisfaction,   3.0)                    AS moyenne_satisfaction,
            COALESCE(fs.jours_retard_paiement,   0)                     AS jours_retard_paiement,
            CASE WHEN (
                COALESCE(ps.taux_presence, 1)          < 0.60
                OR COALESCE(ns.moyenne_notes, 20)      < 8
                OR COALESCE(ac.absences_consecutives, 0) >= 4
                OR COALESCE(fs.jours_retard_paiement, 0) > 45
            ) THEN 1 ELSE 0 END                                         AS abandon
        FROM apprenants a
        LEFT JOIN presence_stats       ps ON ps."apprenantId" = a.id
        LEFT JOIN absences_consecutives ac ON ac."apprenantId" = a.id
        LEFT JOIN notes_stats          ns ON ns."apprenantId" = a.id
        LEFT JOIN satisfaction_stats   ss ON ss."apprenantId" = a.id
        LEFT JOIN finance_stats        fs ON fs."apprenantId" = a.id
        WHERE ps."apprenantId" IS NOT NULL
    """

    df = pd.read_sql(text(query), get_engine(), params={"payment_type": payment_type})

    assert len(df) >= 20, (
        f"Pas assez d'apprenants avec données complètes ({len(df)}). "
        "Minimum 20 requis. Vérifie que les presences sont bien enregistrées."
    )

    print(f"[load_risk_data] ✅ {len(df)} apprenants chargés")
    print(f"  → Taux abandon (label=1) : {df['abandon'].mean():.1%}")
    print(f"  → Distribution :\n{df['abandon'].value_counts().to_string()}")
    return df


def load_inscriptions_data() -> pd.DataFrame:
    """
    Inscriptions dans les sessions par mois (flux métier réel).
    Compte sessions_apprenants, pas seulement apprenants acceptés.

    Colonnes : ds ('YYYY-MM'), y (int)
    Même logique que backend forecast.service.ts (enrolledAt → ici date de session).
    """
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

    assert len(df) >= 3, (
        f"Seulement {len(df)} mois d'historique. "
        "Minimum 3 requis pour entraîner le modèle forecast."
    )

    print(f"[load_inscriptions_data] ✅ {len(df)} mois chargés")
    print(f"  → Total inscriptions sessions : {df['y'].sum()}")
    print(f"  → Période : {df['ds'].iloc[0]} → {df['ds'].iloc[-1]}")
    return df






def load_last_months(n: int = 12) -> pd.DataFrame:
    """
    Charge les N derniers mois CA pour alimenter predict_next_months()
    avec des données fraîches au lieu du last_data figé dans ca_model.pkl.
    """
    engine = get_engine()

    query = f"""
        SELECT
            EXTRACT(YEAR  FROM f.date)::int  AS annee,
            EXTRACT(MONTH FROM f.date)::int  AS mois_num,
            ((EXTRACT(MONTH FROM f.date)::int - 1) / 3 + 1)::int AS trimestre,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'paiement'), 0) AS ca_mensuel,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_formateur'), 0)
                AS total_cout_formateur,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'depense_logistique'), 0)
                AS total_cout_logistique,
            COALESCE(SUM(f.montant) FILTER (WHERE f.type = 'impaye'), 0) AS total_impaye,
            COUNT(DISTINCT f."sessionId") AS nb_sessions
        FROM finances f
        GROUP BY EXTRACT(YEAR FROM f.date), EXTRACT(MONTH FROM f.date)
        ORDER BY annee DESC, mois_num DESC
        LIMIT {n}
    """

    df = pd.read_sql(text(query), engine)
    engine.dispose()
    return df.sort_values(["annee", "mois_num"]).reset_index(drop=True)
