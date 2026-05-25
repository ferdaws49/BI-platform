"""
services/ca_service.py — CA forecasting registry and prediction helper

Rôle : charge `models/ca_model.pkl` et propose `predict_next_months(nb_mois)`.
Liens : `training/train_ca.py`, `api/ca_routes.py`, `models/registry.py` (pattern similaire).
"""

import numpy as np
import pandas as pd
import joblib
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "ca_model.pkl"

class CAModelRegistry:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.FEATURES = None
        self.last_data = None
        self._load()

    def _load(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                "❌ models/ca_model.pkl introuvable. "
                "Lance d'abord : python -m training.train_ca"
            )
        bundle = joblib.load(MODEL_PATH)
        self.model = bundle["model"]
        self.scaler = bundle["scaler"]
        self.FEATURES = bundle["features"]
        self.last_data = bundle.get("last_data")
        print(f"[CAModelRegistry] ✅ Modèle CA chargé ({len(self.FEATURES)} features)")

    def _enrich_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prépare le DataFrame pour la prédiction."""
        df = df.copy()

        # Normaliser noms
        if "ca" in df.columns and "ca_mensuel" not in df.columns:
            df = df.rename(columns={"ca": "ca_mensuel"})
        df["ca_mensuel"] = pd.to_numeric(df["ca_mensuel"], errors="coerce").fillna(0)

        # Date
        if "annee" in df.columns and "mois" in df.columns:
            df["annee"] = pd.to_numeric(df["annee"], errors="coerce").fillna(0).astype(int)
            df["mois_num"] = pd.to_numeric(df["mois"], errors="coerce").fillna(0).astype(int)
        else:
            df["date"] = pd.to_datetime(df["mois"].astype(str), errors="coerce")
            df["annee"] = df["date"].dt.year.fillna(0).astype(int)
            df["mois_num"] = df["date"].dt.month.fillna(0).astype(int)

        if "trimestre" not in df.columns:
            df["trimestre"] = ((df["mois_num"] - 1) // 3) + 1
        else:
            df["trimestre"] = pd.to_numeric(df["trimestre"], errors="coerce").fillna(0).astype(int)

        # Fallbacks à 0 pour les features métiers si absentes
        for col in ["total_cout_formateur", "total_cout_logistique", "total_impaye"]:
            if col not in df.columns:
                df[col] = 0
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        for col in ["nb_sessions", "total_inscrits"]:
            if col not in df.columns:
                df[col] = 0
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

        # Calcul des dérivées
        df["taux_impaye"] = df["total_impaye"] / (df["ca_mensuel"] + 1)
        df["marge_lag1"] = (
            df["ca_mensuel"].shift(1)
            - df["total_cout_formateur"].shift(1)
            - df["total_cout_logistique"].shift(1)
        )
        df["marge_lag1"] = df["marge_lag1"].fillna(
            df["ca_mensuel"] - df["total_cout_formateur"] - df["total_cout_logistique"]
        )

        df["mois_sin"] = np.sin(2 * np.pi * df["mois_num"] / 12)
        df["mois_cos"] = np.cos(2 * np.pi * df["mois_num"] / 12)

        return df.reset_index(drop=True)

    def _build_row_features(self, df, mois_suivant, annee_suivante, trimestre):
        """Construit le vecteur de 16 features dans l'ordre exact du modèle."""
        n = len(df)

        last = df.iloc[-1]
        last2 = df.iloc[-2] if n >= 2 else last
        last3 = df.iloc[-3] if n >= 3 else last2

        # lag_12 : fallback sur lag_1 si historique < 12 mois
        lag12 = df.iloc[-12]["ca_mensuel"] if n >= 12 else last["ca_mensuel"]

        # Moyennes mobiles
        moy_3m = df["ca_mensuel"].iloc[-3:].mean() if n >= 3 else last["ca_mensuel"]
        moy_6m = df["ca_mensuel"].iloc[-6:].mean() if n >= 6 else last["ca_mensuel"]

        return [[
            last["ca_mensuel"],   # ca_lag_1
            last2["ca_mensuel"],  # ca_lag_2
            last3["ca_mensuel"],  # ca_lag_3
            lag12,                # ca_lag_12
            moy_3m,               # ca_moy_3m
            moy_6m,               # ca_moy_6m
            last["total_cout_formateur"],   # cout_formateur_lag1
            last["total_cout_logistique"],  # cout_logistique_lag1
            last["total_inscrits"],         # inscrits_lag1
            last["nb_sessions"],            # nb_sessions_lag1
            last["taux_impaye_lag1"],           # taux_impaye
            last["marge_lag1"],             # marge_lag1
            mois_suivant,                   # mois_num
            trimestre,                      # trimestre
            np.sin(2 * np.pi * mois_suivant / 12),  # mois_sin
            np.cos(2 * np.pi * mois_suivant / 12),  # mois_cos
        ]]

    def predict_next_months(self, historique: pd.DataFrame, nb_mois: int = 3) -> list:
        df = self._enrich_data(historique)

        if len(df) < 3:
            raise ValueError("Historique insuffisant (minimum 3 mois requis)")

        previsions = []

        for _ in range(nb_mois):
            last = df.iloc[-1]

            mois_suivant = int(last["mois_num"]) % 12 + 1
            annee_suivante = int(last["annee"]) + (1 if mois_suivant == 1 else 0)
            trimestre = ((mois_suivant - 1) // 3) + 1

            features = self._build_row_features(df, mois_suivant, annee_suivante, trimestre)
            ca_predit = float(self.model.predict(self.scaler.transform(features))[0])
            ca_predit = max(0, ca_predit)

            # Coûts : légère variation pour réalisme (±2.5%)
            facteur = 1.0 + (np.random.random() - 0.5) * 0.05
            cout_formateur = last["total_cout_formateur"] * facteur
            cout_logistique = last["total_cout_logistique"] * facteur
            marge = ca_predit - cout_formateur - cout_logistique

            previsions.append({
                "mois": f"{annee_suivante}-{mois_suivant:02d}",
                "ca_predit": round(ca_predit, 2),
                "marge_estimee": round(marge, 2),
            })

            # Ajouter la prédiction au DataFrame
            new_row = {
                "annee": annee_suivante,
                "mois_num": mois_suivant,
                "trimestre": trimestre,
                "mois_sin": np.sin(2 * np.pi * mois_suivant / 12),
                "mois_cos": np.cos(2 * np.pi * mois_suivant / 12),
                "ca_mensuel": ca_predit,
                "total_cout_formateur": cout_formateur,
                "total_cout_logistique": cout_logistique,
                "total_inscrits": last["total_inscrits"],
                "nb_sessions": last["nb_sessions"],
                "total_impaye": last["total_impaye"],
                "taux_impaye": last["taux_impaye"],
                "marge_lag1": marge,
            }
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

            # RECALCULER les features dérivées pour le prochain tour
            n = len(df)
            df.loc[n-1, "ca_lag_1"] = df.iloc[-2]["ca_mensuel"]
            df.loc[n-1, "ca_lag_2"] = df.iloc[-3]["ca_mensuel"] if n >= 3 else df.iloc[-2]["ca_mensuel"]
            df.loc[n-1, "ca_lag_3"] = df.iloc[-4]["ca_mensuel"] if n >= 4 else df.iloc[-2]["ca_mensuel"]
            df.loc[n-1, "ca_lag_12"] = df.iloc[-13]["ca_mensuel"] if n >= 13 else df.iloc[-2]["ca_mensuel"]
            df.loc[n-1, "ca_moy_3m"] = df["ca_mensuel"].iloc[-4:-1].mean()
            df.loc[n-1, "ca_moy_6m"] = df["ca_mensuel"].iloc[-7:-1].mean() if n >= 7 else df["ca_mensuel"].iloc[-4:-1].mean()
            df.loc[n-1, "cout_formateur_lag1"] = df.iloc[-2]["total_cout_formateur"]
            df.loc[n-1, "cout_logistique_lag1"] = df.iloc[-2]["total_cout_logistique"]
            df.loc[n-1, "inscrits_lag1"] = df.iloc[-2]["total_inscrits"]
            df.loc[n-1, "nb_sessions_lag1"] = df.iloc[-2]["nb_sessions"]

        return previsions


# Instance globale
ca_registry = CAModelRegistry()