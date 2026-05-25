"""
diagnostics_loader.py — quick diagnostics for DB loaders and synthetic generators

Usage:
  - Use synthetic mode (default): run with USE_DB=0 or leave unset
  - Use DB mode: set environment vars `USE_DB=1` and `DATABASE_URL` then run

The script prints shapes, null counts, basic stats and a sample for each loader.
"""

import os
import pandas as pd

USE_DB = os.getenv("USE_DB", "0") in ("1", "true", "True")

print(f"[diagnostics] USE_DB={USE_DB}")

# Helper

def diag_df(name: str, df: pd.DataFrame, max_rows: int = 5):
    print(f"\n--- {name} ---")
    if df is None:
        print("(no data)")
        return
    print("shape:", df.shape)
    print("nulls:\n", df.isnull().sum())
    try:
        print("describe:\n", df.describe(include='all').transpose().head(10))
    except Exception:
        pass
    print("sample:\n", df.head(max_rows))


# 1) Risk
try:
    if USE_DB:
        from data.postgres_loader import load_risk_data
        print("Calling load_risk_data(payment_type='impaye') ...")
        df_risk = load_risk_data()
    else:
        from training.train_risk import generate_data
        X, y = generate_data()
        import numpy as np
        df_risk = pd.DataFrame(X, columns=[
            "taux_presence",
            "absences_consecutives",
            "moyenne_notes",
            "tendance_notes",
            "moyenne_satisfaction",
            "jours_retard_paiement",
        ])
        df_risk["abandon"] = y
    diag_df("risk", df_risk)
except Exception as e:
    print("[diagnostics] risk loader error:", e)

# 2) Forecast inscriptions
try:
    if USE_DB:
        from data.postgres_loader import load_inscriptions_data
        df_fore = load_inscriptions_data()
    else:
        from training.train_forecast import generate_data
        df_fore = generate_data()
    diag_df("forecast inscriptions", df_fore)
except Exception as e:
    print("[diagnostics] forecast loader error:", e)

# 3) CA
try:
    if USE_DB:
        from data.postgres_loader import load_ca_data
        df_ca = load_ca_data()
    else:
        from training.train_ca import generate_data
        df_ca = generate_data()
    diag_df("ca", df_ca)
except Exception as e:
    print("[diagnostics] ca loader error:", e)

# 4) Sessions / Deficit
try:
    if USE_DB:
        from data.postgres_loader import load_sessions_data
        df_sess = load_sessions_data()
    else:
        from training.train_deficit import generate_data
        X, y = generate_data()
        df_sess = pd.DataFrame(X, columns=[
            "nb_inscrits", "cout_formateur", "cout_logistique",
            "montant_inscriptions", "duree_jours", "mois",
        ])
        df_sess["est_deficitaire"] = y
    diag_df("sessions/deficit", df_sess)
except Exception as e:
    print("[diagnostics] sessions loader error:", e)

print("\n[diagnostics] done")
