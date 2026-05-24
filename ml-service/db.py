import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

# load .env
# Cherche le .env à la racine du projet (parent de ml-service)
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=str(env_path))
    print(f"[postgres_loader] ✅ .env chargé: {env_path}")
else:
    # Fallback: dossier courant
    load_dotenv()
    print("[postgres_loader] ⚠️ .env non trouvé à la racine, tentative locale")


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DW_HOST", "localhost"),
        database=os.getenv("DW_DB", "postgres"),
        user=os.getenv("DW_USER", "postgres"),
        password=os.getenv("DW_PASSWORD"),
        port=os.getenv("DW_PORT", "5432")
    )