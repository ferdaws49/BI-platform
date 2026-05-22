import os
import psycopg2
import pandas as pd
from dotenv import load_dotenv
from pathlib import Path

# Cherche le .env à la racine du projet (parent de ml-service)
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=str(env_path))
    print(f"[postgres_loader] ✅ .env chargé: {env_path}")
else:
    # Fallback: dossier courant
    load_dotenv()
    print("[postgres_loader] ⚠️ .env non trouvé à la racine, tentative locale")

def load_ca_data():
    # ── PRIORITÉ 1: Utiliser DATABASE_URL (Supabase) ──
    database_url = os.getenv("DATABASE_URL") or os.getenv("DIRECT_URL")
    
    if database_url:
        # Supabase donne parfois une URL avec ?pgbouncer=true, on la nettoie
        clean_url = database_url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")
        conn = psycopg2.connect(clean_url)
        print("[DB] ✅ Connexion via DATABASE_URL (Supabase)")
    else:
        # ── PRIORITÉ 2: Variables séparées ──
        host = os.getenv("DW_HOST", "localhost")
        database = os.getenv("DW_DB") or os.getenv("DW_NAME", "postgres")
        user = os.getenv("DW_USER") or os.getenv("DW_USERNAME", "postgres")
        password = os.getenv("DW_PASSWORD")
        port = os.getenv("DW_PORT", "5432")

        print(f"[DB] Host={host}, DB={database}, User={user}, Port={port}")
        print(f"[DB] Password={'TROUVE' if password else 'MANQUANT'}")

        if not password:
            raise ValueError(
                "❌ DW_PASSWORD vide.\n"
                "Vérifie que ton .env contient bien DW_PASSWORD=xxx\n"
                "Et qu'il est à la racine du projet BI-platform/"
            )

        conn = psycopg2.connect(
            host=host, database=database, user=user,
            password=password, port=port
        )

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