import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

# ─── Charge le .env depuis ml-service/ ───
current_dir = Path(__file__).resolve().parent
env_path = current_dir / ".env"

if env_path.exists():
    load_dotenv(dotenv_path=str(env_path))
    print(f"[db] ✅ .env chargé: {env_path}")
else:
    print(f"[db] ❌ .env introuvable à {env_path}")


def get_connection():
    """
    Priorité :
      1. DATABASE_URL (Supabase pooler)
      2. DIRECT_URL (connexion directe)
      3. Variables DW_* (fallback)
    """
    
    # ── PRIORITÉ 1 : DATABASE_URL ──
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        conn = _connect_from_url(database_url, source="DATABASE_URL")
        if conn:
            return conn
    
    # ── PRIORITÉ 2 : DIRECT_URL ──
    direct_url = os.getenv("DIRECT_URL")
    if direct_url:
        conn = _connect_from_url(direct_url, source="DIRECT_URL")
        if conn:
            return conn
    
    # ── PRIORITÉ 3 : Variables séparées ──
    host = os.getenv("DW_HOST")
    database = os.getenv("DW_DB") or os.getenv("DW_NAME")
    user = os.getenv("DW_USER") or os.getenv("DW_USERNAME")
    password = os.getenv("DW_PASSWORD")
    port = os.getenv("DW_PORT", "5432")
    
    if not all([host, database, user, password]):
        missing = []
        if not host: missing.append("DW_HOST")
        if not database: missing.append("DW_NAME/DW_DB")
        if not user: missing.append("DW_USERNAME")
        if not password: missing.append("DW_PASSWORD")
        raise ValueError(f"Variables manquantes dans .env: {', '.join(missing)}")
    
    print(f"[db] 🔌 Connexion via variables: {host}:{port}/{database}")
    return psycopg2.connect(
        host=host, database=database, user=user,
        password=password, port=port
    )


def _connect_from_url(url: str, source: str):
    """
    Parse l'URL Supabase, retire les paramètres non supportés par psycopg2
    (ex: pgbouncer, connection_limit), et connecte.
    """
    # Remplace postgres:// par postgresql:// si besoin
    url = url.replace("postgres://", "postgresql://", 1)
    
    parsed = urlparse(url)
    
    # Récupère les query params
    query_params = parse_qs(parsed.query)
    
    # Supprime les paramètres que psycopg2 ne supporte pas
    for bad_param in ["pgbouncer", "connection_limit", "pool_mode", "supa"]:
        query_params.pop(bad_param, None)
        query_params.pop(bad_param.lower(), None)
    
    # Reconstruit l'URL sans les params problématiques
    clean_query = urlencode(query_params, doseq=True) if query_params else ""
    
    clean_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        clean_query,
        parsed.fragment
    ))
    
    print(f"[db] 🔌 Connexion via {source} (nettoyée)")
    
    try:
        return psycopg2.connect(clean_url)
    except Exception as e:
        print(f"[db] ❌ Échec connexion {source}: {e}")
        return None